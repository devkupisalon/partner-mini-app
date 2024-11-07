import { v4 as uuidv4 } from 'uuid';

import bot from './init-bot.js';
import logger from '../logs/logger.js';

import { constants, invite_texts_map, messages_map, managers_map } from '../constants.js';
import { get_partners_data, get_partner_name_and_manager, do_calc, get_all_groups_ids } from './sheets.js';
import { create_folder, save_media } from './drive.js';
import { parse_text, HQD_photo, prepare_calc } from './helper.js';
import { deletePropertiesFromFile, append_json_file, process_return_json, process_write_json } from './process-json.js';

const interval = 10000;

let { GROUP_CHAT_ID, BOT_TOKEN, } = constants;
const { send_media_obj_path, media_files_obj_path } = constants;

GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

const parse_mode = 'Markdown';

/** GLOBAL OBJ */
let send_media_obj = {};
let media_files = {};

/** Logger message */
const l_message = (l, id, to_id) => { return `${l} message successfully sended from chat_id ${id} to group_chat_id ${to_id}` };

const logger_messages = {
    media_group: (id, to_id) => l_message('Media Group', id, to_id),
    photo: (id, to_id) => l_message('Photo', id, to_id),
    video: (id, to_id) => l_message('Video', id, to_id),
    voice: (id, to_id) => l_message('Voice', id, to_id),
    document: (id, to_id) => l_message('Document', id, to_id),
    text: (id, to_id) => l_message('Text', id, to_id),
};

/**
 * Send first init messages to user
 * @param {string} chat_id - user chat_id 
 * @param {string} type - Agent or Partner
 * @param {string} uid - Partner ID
 * @param {string} group_id  - group ID
 * @param {string} manager_chat_id - Manager chat_id
 * @param {string} name - Partner nname
 */
const send_first_messages = async (chat_id, type, uid, group_id, manager_chat_id, name, success_send) => {
    let CHAT_ID;
    let is_invite_send = false;

    try {
        for await (const k of Object.keys(messages_map)) {
            const { link, to_pin } = messages_map[k];
            if (messages_map[k][type]) {

                const { url, text, button_text } = messages_map[k][type];
                const create_url = typeof url === 'function' ? url(uid) : url;

                const messageOptions = {
                    link: {
                        message_text_option: text,
                        reply_markup: { inline_keyboard: [[{ text: button_text, url: create_url }]] }
                    },
                    text: {
                        message_text_option: text
                    }
                };

                const messageType = link ? 'link' : 'text';
                const { message_text_option, reply_markup } = messageOptions[messageType];
                CHAT_ID = group_id ? `-100${group_id}` : chat_id;

                if (type === 'Партнер' && !is_invite_send) {

                    try {
                        await set_chat_title(CHAT_ID, `Рабочая группа с Партнером ${name}`);
                    } catch (error) {
                        logger.error(`Partner chat ID not found: ${error.message}`);
                    }

                    await send_group_invite_link(CHAT_ID, { partner: chat_id, manager: manager_chat_id }, invite_texts_map, name);
                    is_invite_send = true;
                }

                const { message_id } = await (link ?
                    bot.sendMessage(CHAT_ID, message_text_option, { reply_markup }) :
                    bot.sendMessage(CHAT_ID, message_text_option));

                if (message_id) {
                    logger.info('Message successfully sent to the user');
                    if (to_pin) {
                        await bot.pinChatMessage(CHAT_ID, message_id);
                        logger.info(`Message with id ${message_id} successfully pinned`);
                    }
                }
            }
        }

        return { success: true, success_send_check: success_send };

    } catch (error) {
        logger.error(`Error sending messages: ${error.stack}, ${CHAT_ID}`);
        return { succces: false, success_send_check: false };
    }
}

/**
 * Function to send group invite link to users.
 * @param {string} groupId - The ID of the group from which to get the invite.
 * @param {Object} user_ids - Object of user IDs to send the invite to.
 * @param {Object} map - Object mapping user IDs to personalized messages.
 * @param {string} name - Name of invited organization.
 */
const send_group_invite_link = async (groupId, user_ids, map, name) => {
    await bot.exportChatInviteLink(groupId)
        .then(inviteLink => {
            Object.keys(user_ids).forEach(k => {
                bot.sendMessage(user_ids[k], `${map[k](name)} ${inviteLink}`);
            });
        })
        .catch(error => {
            logger.error(`Error while export chat_invite_link: ${error}`);
        });
}

/**
 * Function to set the title of a group chat.
 * @param {string} groupId - The ID of the group where the title will be changed.
 * @param {string} newTitle - The new title for the group chat.
 */
const set_chat_title = async (groupId, newTitle) => {
    bot.setChatTitle(groupId, newTitle)
        .then(() => {
            logger.info(`Group chat title with id:${groupId} changed to: ${newTitle}`);
        })
        .catch(error => {
            logger.error(`Error while changing group chat title with id:${groupId} : ${error}`);
        });
}

/** 
 * Success function
 */
const p_success = async (m, reply_to_message_id, id, to_id) => {
    logger.info(logger_messages[m](id, to_id));
    await bot.sendMessage(id, 'Сообщение отправлено', { reply_to_message_id });
}

/** Send media group message */
const send_media_group = async () => {

    const hash_id = uuidv4();
    const media_obj = await process_return_json(send_media_obj_path);

    try {
        if (Object.keys(media_obj).length > 0) {
            const mediaObjValues = Object.values(media_obj);

            for (let i = 0; i < mediaObjValues.length; i++) {
                const currentMediaObj = mediaObjValues[i];

                let { caption, mediaFiles, message_id, id, chat_id, reply_to_message_id, from_user, user_id } = currentMediaObj;

                if (from_user) caption = `${caption.slice(0, -2)}:${hash_id}\``;

                const mediaGroup = mediaFiles.map(({ type, media }, index) => {
                    if (index === 0) {
                        return { type, media, caption, parse_mode };
                    }
                    return { type, media };
                });

                let message = reply_to_message_id ?
                    await bot.sendMediaGroup(chat_id, mediaGroup, { reply_to_message_id }) :
                    await bot.sendMediaGroup(chat_id, mediaGroup);

                if (message) {
                    p_success('media_group', message_id, id, GROUP_CHAT_ID);
                    if (from_user) process_save_media_to_obj(message, user_id, hash_id);
                    delete media_obj[Object.keys(media_obj)[i]];
                    await process_write_json(send_media_obj_path, media_obj);
                }
            }
        }
    } catch (error) {
        logger.error(`Error in send_media_group: ${error.stack}`);
    }
}

/**
 * Process and save media files from a message to the respective chat ID object.
 * @param {object} message - Message object containing media data.
 * @param {string} chat_id - ID of the chat where the media files are received.
 * @param {string} hash_id - hash.
 */
const process_save_media_to_obj = async (message, chat_id, hash_id, hash_partner) => {
    const timestamp = new Date().getTime();

    if (!hash_partner) {

        if (!media_files[`${chat_id}_${timestamp}`]) {
            media_files[`${chat_id}_${timestamp}`] = {
                data: [],
                message_ids: [],
                experation_date: new Date().toISOString(),
                hash_id
            };
        }

        Object.values(message).forEach(({ message_id, photo, video, voice, document }) => {
            const media = photo ? HQD_photo(photo).file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : '';
            const mime_type = photo ? 'image/png' : video ? video.mime_type : voice ? voice.mime_type : document ? document.mime_type : '';

            media_files[`${chat_id}_${timestamp}`].data.push({ media, mime_type });
            media_files[`${chat_id}_${timestamp}`].message_ids.push(message_id);
        });

    } else {
        const { message_id, photo, video, voice, document, media_group_id } = message;
        if (!media_files[`${chat_id}_${media_group_id}`]) {
            media_files[`${chat_id}_${media_group_id}`] = {
                data: [],
                message_ids: [],
                experation_date: new Date().toISOString(),
                hash_id,
                hash_partner
            };
        }

        const media = photo ? HQD_photo(photo).file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : '';
        const mime_type = photo ? 'image/png' : video ? video.mime_type : voice ? voice.mime_type : document ? document.mime_type : '';

        media_files[`${chat_id}_${media_group_id}`].data.push({ media, mime_type });
        media_files[`${chat_id}_${media_group_id}`].message_ids.push(message_id);
    }

    await append_json_file(media_files_obj_path, media_files);

    // logger.info(media_files);
}

/**
 * Retrieve file URLs from Telegram based on the provided files data.
 * @param {Array|String} files - Object or Array containing data of files to be processed.
 * @returns {array|string} - An array of file URLs if multiple files are provided, or a single file URL.
 */
const getTelegramFiles = async (files) => {
    let fileUrls = [];
    if (Array.isArray(files)) {
        for (const { media, mime_type } of files) {
            try {
                const { file_path } = await bot.getFile(media);
                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
                logger.info(`File url successfully received: ${fileUrl}`);
                fileUrls.push({ fileUrl, mime_type });
            } catch (error) {
                logger.error(`Error in getTelegramFiles: ${error}`);
            }
        }
    }
    return fileUrls;
}

/**
 * Process message data to handle media files and forwarding messages.
 * 
 * @param {object} data The data object containing message details.
 */
const process_message = async (data) => {
    let { text, partner_name, partner_id, message_id, id, photo, video, voice, document, media_group_id, message, from_user, chat_id, reply_to_message_id } = data;

    const hash = `hash:${partner_id}:${message_id}:${id}:${partner_name}\n`;

    from_user ?
        text = `Агент *${partner_name}*:\n\n${text}\n\n\`${hash}\`` :
        text = text;

    let CHAT_ID = from_user ? GROUP_CHAT_ID : chat_id;

    const type_m = photo ? 'photo' : video ? 'video' : voice ? 'voice' : document ? 'document' : 'text';
    const media = photo ? HQD_photo(photo).file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : text;

    if (media_group_id) {

        if (!send_media_obj[id]) send_media_obj[id] = { message_id, media_group_id, id, mediaFiles: [], chat_id: CHAT_ID };
        if (message.caption) {
            send_media_obj[id].caption = from_user ? `Агент *${partner_name}*:\n\n${message.caption}\n\n\`${hash}\`` : text;
        }

        const mediaTypeMap = {
            'photo': 'photo',
            'video': 'video',
            'voice': 'voice',
            'document': 'document',
            'text': ''
        };

        const mediaType = mediaTypeMap[type_m];
        if (mediaType) {
            send_media_obj[id].mediaFiles.push({ type: mediaType, media: media });
        }

        if (!from_user) {
            send_media_obj[id].reply_to_message_id = reply_to_message_id;
        } else {
            send_media_obj[id].from_user = from_user;
            send_media_obj[id].user_id = id;
        }

        logger.info(`Media files prepared to send: ${JSON.stringify(send_media_obj[id])}`);
        await append_json_file(send_media_obj_path, send_media_obj);
        return;
    }

    try {

        const data = await (
            type_m === 'photo' ? bot.sendPhoto(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                type_m === 'video' ? bot.sendVideo(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                    type_m === 'voice' ? bot.sendVoice(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                        type_m === 'document' ? bot.sendDocument(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                            bot.sendMessage(CHAT_ID, media, from_user ? { parse_mode } : { parse_mode, reply_to_message_id }))

        if (data.message_id) {
            p_success(type_m, message_id, id, GROUP_CHAT_ID);
        }

    } catch (error) {
        logger.error(`Error forwarding user message from chat_id ${id} to chat_id ${CHAT_ID}: ${error.stack}`);
    }
}

/**
 * Forward messages from user chats to managers groups chat and
 * send back responses from managers to user chats 
 */
bot.on('message', async (message) => {

    // logger.info(message);

    const { contact, chat: { id, type }, photo, document, voice, video, media_group_id, reply_to_message, message_id } = message;

    const from_id = message.from.id;
    const group_ids_obj = await get_all_groups_ids();
    const text_to_parse = reply_to_message?.text || reply_to_message?.caption;

    const save = ['Сохранить медиа', 'сохранить медиа'].some(c => message.text?.includes(c));
    const calc = ['Создать расчет', 'создать расчет'].some(c => message.text?.includes(c));

    const is_manager = Object.values(managers_map).find(k => k === from_id) ? true : false;
    const is_group = ['group', 'supergroup'].includes(type);
    const is_bot = reply_to_message?.from.is_bot;
    const is_managers_work_chat = String(id) === GROUP_CHAT_ID;
    const is_partner_group = group_ids_obj.hasOwnProperty(reply_to_message?.chat.id);
    const is_include_groups = group_ids_obj.hasOwnProperty(`${id}`) || group_ids_obj.hasOwnProperty(`${id}`);

    let text = message.text || message.caption || '';
    let user_ID = reply_to_message && is_manager && is_group ? reply_to_message?.from.id : is_group ? from_id : id;

    if (contact) return;

    const { partner_name, partner_id } = await get_partners_data(user_ID);

    // process agent messages
    if (partner_name && partner_id && !is_group) {

        await process_message({
            text,
            partner_name,
            partner_id,
            message_id,
            id,
            photo,
            video,
            voice,
            document,
            media_group_id,
            message,
            from_user: true
        });
    }

    // process save media to json if is media send from partner in group
    if (is_group && partner_id && partner_name && media_group_id) {

        const hash_id = uuidv4();
        const hash_partner = `hash:${partner_id}:${message_id}:${user_ID}:${partner_name}:${media_group_id}\n`;
        await process_save_media_to_obj(message, user_ID, hash_id, hash_partner);
        return;
    }

    // process manager messages part
    if (is_group) {

        logger.info(`Received message from ${type} with ID: ${id}`);

        if (is_managers_work_chat || is_include_groups) {

            // logger.info(reply_to_message);

            if (reply_to_message && is_bot && !save && !calc) {

                const { agent_message_id, chat_id } = parse_text(text_to_parse);

                await process_message({
                    text: message.text || message.caption || '',
                    message_id,
                    id,
                    photo,
                    video,
                    voice,
                    document,
                    media_group_id,
                    message,
                    chat_id,
                    reply_to_message_id: agent_message_id
                })
            }

            // process save media from agents
            if (reply_to_message && save && is_manager) {

                await process_save({ reply_to_message, message_id, id, message });
            }

            if (reply_to_message && is_manager && calc) {

                let agent_id;

                const { phone, name, brand, model, gosnum } = prepare_calc(text_to_parse, is_partner_group ? true : false);
                const hash_folder_id = message.text.match(/hash:(.*)/)[1];

                agent_id = is_partner_group ? partner_id : await parse_text(text_to_parse).agent_id;
                const { link } = await do_calc({ partner: agent_id, phone, name, brand, model, gosnum, folderId: hash_folder_id });

                if (link) {
                    await bot.sendMessage(id,
                        `Расчет создан, [открыть](${link})\n\n\`hash:${hash_folder_id}\``,
                        {
                            reply_to_message_id: message_id,
                            parse_mode,
                            disable_web_page_preview: true
                        }
                    );
                }
            }
        }
    }
});

/**
 * Processes and saves media content based on the provided data.
 * @param {Object} data - Data containing information about the media content.
 */
const process_save = async (data) => {

    let media_data;

    try {

        const { reply_to_message, message_id, id, message } = data;

        const media = reply_to_message.photo ? HQD_photo(reply_to_message.photo) :
            reply_to_message.video ? reply_to_message.video :
                reply_to_message.voice ? reply_to_message.voice :
                    reply_to_message.document ? reply_to_message.document : ''

        if (media !== '') {

            let agent_id;
            let agent_name;
            let chat_id;
            let hash_id;

            logger.info(GROUP_CHAT_ID);
            logger.info(reply_to_message.chat.id);

            if (reply_to_message.chat.id === GROUP_CHAT_ID) {

                const d = parse_text(reply_to_message.text || reply_to_message.caption);
                agent_id = d.agent_id;
                agent_name = d.agent_name;
                chat_id = d.chat_id;
                hash_id = d.hash_id;
            }

            const media_obj = await process_return_json(media_files_obj_path);

            const selectedData = Object.entries(media_obj).find(([k, v]) => {
                const [c_chat_id, hash] = k.split("_");
                if (v.hash_partner) {
                    const d = parse_text(v.hash_partner);
                    agent_id = d.agent_id;
                    agent_name = d.agent_name;
                    chat_id = d.chat_id;
                    return c_chat_id === d.chat_id && hash === d.hash_id && v.data && v.data.length > 0;
                } else {
                    return c_chat_id === chat_id && v.hash_id === hash_id && v.data && v.data.length > 0;
                }
            });

            let folder = {};

            const hash_folder_id = message.text.match(/hash:(.*)/);

            if (hash_folder_id) {
                folder.id = hash_folder_id[1];
                folder.folderLink = `https://drive.google.com/drive/folders/${folder.id}`;
            } else {
                const { partner_folder } = await get_partner_name_and_manager(agent_id);
                folder = await create_folder(`${hash_id || uuidv4()}-${agent_name}`, partner_folder);
            }

            media_data = selectedData ? selectedData[1].data : [{ media: media.file_id, mime_type: !media.mime_type ? 'image/png' : media.mime_type }];

            const fileUrls = await getTelegramFiles(media_data);
            const { success } = await save_media({ fileUrls, folder: folder.id });

            if (success) {
                await bot.sendMessage(id,
                    `Медиа контент сохранен в [папку](${folder.folderLink})\n\n\`hash:${folder.id}\``,
                    {
                        reply_to_message_id: message_id,
                        parse_mode,
                        disable_web_page_preview: true
                    });
            }
        } else {
            logger.info(`There are no media to save`);
        }
    } catch (error) {
        logger.error(`Error in process_save: ${error}`);
    }
}

/**
 * Asynchronously executes a task based on the send_media_obj object.
 * If the send_media_obj object contains keys, it calls the send_media_group function.
 * Otherwise, it logs a message indicating there are no media_group_files to send.
 * Sets a timeout to trigger the executeTask function again after a specified interval.
 */
async function executeTask() {
    const media_obj = await process_return_json(send_media_obj_path);
    if (Object.keys(media_obj).length > 0) {
        await send_media_group();
    }
    setTimeout(executeTask, interval);
}

/**
 * SCHEDULER FUNCTIONS FOR UPDATE GLOBAL CONSTANTS
 */
executeTask(); // Call every 10 cseconds
setInterval(deletePropertiesFromFile, 60 * 60 * 1000); // Call every hour

// Handle errors
bot.on('polling_error', (error) => {
    logger.error(error);
});

export { send_first_messages };