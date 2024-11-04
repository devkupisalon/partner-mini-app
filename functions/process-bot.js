import bot from './init-bot.js';
import logger from '../logs/logger.js';

import { constants, invite_texts_map, messages_map, managers_map } from '../constants.js';
import { get_partners_data, get_partner_name_and_manager } from './sheets.js';
import { create_folder, save_media } from './drive.js';
import { encryptString, decryptString, stringToObject, objectToString } from './validate.js';

const interval = 10000;

let { GROUP_CHAT_ID, BOT_TOKEN } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

const parse_mode = 'Markdown';

/** GLOBAL OBJ */
let send_media_obj = {};
let media_files = {};

/** Logger message */
const l_message = (l, id) => { return `${l} message successfully sended from chat_id ${id} to group_chat_id ${GROUP_CHAT_ID}` };

const logger_messages = {
    media_group: (id) => l_message('Media Group', id),
    photo: (id) => l_message('Photo', id),
    video: (id) => l_message('Video', id),
    voice: (id) => l_message('Voice', id),
    document: (id) => l_message('Document', id),
    text: (id) => l_message('Text', id),
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
                CHAT_ID = group_id ? `-${group_id}` : chat_id;

                if (type === 'Партнер' && !is_invite_send) {

                    try {
                        await set_chat_title(CHAT_ID, `Рабочая группа с Партнером ${name}`);
                        success_send = true;
                    } catch (error) {
                        logger.error(`Partner chat ID not found: ${error.message}`);
                        CHAT_ID = CHAT_ID.replace('-', '-100');
                        success_send = false;
                    }

                    if (!success_send) {
                        await set_chat_title(CHAT_ID, `Рабочая группа с Партнером ${name}`);
                        success_send = true;
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
const p_success = async (m, reply_to_message_id, id) => {
    logger.info(logger_messages[m](id));
    await bot.sendMessage(id, 'Сообщение отправлено', { reply_to_message_id });
}

/** Send media group message */
const send_media_group = async () => {

    try {
        if (Object.keys(send_media_obj).length > 0) {
            const mediaObjValues = Object.values(send_media_obj);

            for (let i = 0; i < mediaObjValues.length; i++) {
                const currentMediaObj = mediaObjValues[i];

                const { caption, mediaFiles, messageId, id, chat_id, reply_to_message_id, from_user, user_id } = currentMediaObj;

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
                    p_success('media_group', messageId, id);
                    if (from_user) process_save_media_to_obj(message, user_id);
                    delete send_media_obj[Object.keys(send_media_obj)[i]];
                }
            }
        }
    } catch (error) {
        logger.error(`Error in send_media_group: ${error}`);
    }
}

/**
 * Process and save media files from a message to the respective chat ID object.
 * @param {object} message - Message object containing media data.
 * @param {string} chat_id - ID of the chat where the media files are received.
 */
const process_save_media_to_obj = async (message, chat_id) => {
    logger.info(message);
    const timestamp = new Date().getTime();
    if (!media_files[`${chat_id}_${timestamp}`]) {
        media_files[`${chat_id}_${timestamp}`] = {
            data: [],
            message_ids: [],
            experation_date: new Date().toISOString()
        };
    }

    Object.values(message).forEach(({ message_id, photo, video, voice, document }) => {
        const media = photo ? photo[0].file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : '';

        media_files[`${chat_id}_${timestamp}`].data.push({ media });
        media_files[`${chat_id}_${timestamp}`].message_ids.push(message_id);
    });

    logger.info(media_files);
}

/**
 * Retrieve file URLs from Telegram based on the provided files data.
 * @param {Array|String} files - Object or Array containing data of files to be processed.
 * @returns {array|string} - An array of file URLs if multiple files are provided, or a single file URL.
 */
const getTelegramFiles = async (files) => {
    let fileUrls;
    if (Array.isArray(files)) {
        fileUrls = files.map(async ({ media }) => {
            try {
                const { file_path } = await bot.getFile(media);
                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
                logger.info(`File url successfully received: ${fileUrl}`);
                return fileUrl;
            } catch (error) {
                logger.error(`Error in getTelegramFiles: ${error}`);
            }
        });
    } else {
        const { file_path } = await bot.getFile(files);
        fileUrls = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
    }

    return fileUrls;
}

/**
 * Process message data to handle media files and forwarding messages.
 * 
 * @param {object} data The data object containing message details.
 */
const process_message = async (data) => {
    let { text, partner_name, partner_id, messageId, id, photo, video, voice, document, media_group_id, message, from_user, chat_id, reply_to_message_id } = data;

    const hash = `hash:${partner_id}:${messageId}:${id}:${partner_name}\n`;
    // encryptString(`agent_id=${partner_id}&agent_message_id=${messageId}&chat_id=${id}&agent_name=${partner_name}`, BOT_TOKEN);

    from_user ?
        text = `Агент *${partner_name}*:\n\n${text}\n\n${hash}` :
        text = text;

    let CHAT_ID = from_user ? GROUP_CHAT_ID : chat_id;

    const type_m = photo ? 'photo' : video ? 'video' : voice ? 'voice' : document ? 'document' : 'text';
    const media = photo ? photo[0].file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : text;

    if (media_group_id) {

        if (!send_media_obj[id]) send_media_obj[id] = { messageId, media_group_id, id, mediaFiles: [], chat_id: CHAT_ID };
        if (message.caption) {
            send_media_obj[id].caption = from_user ? `Агент *${partner_name}*:\n\n${message.caption}\n\n${hash}\n` : text;
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
        return;
    }

    try {

        const { message_id } = await (
            type_m === 'photo' ? bot.sendPhoto(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                type_m === 'video' ? bot.sendVideo(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                    type_m === 'voice' ? bot.sendVoice(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                        type_m === 'document' ? bot.sendDocument(CHAT_ID, media, from_user ? { caption: text, parse_mode } : { reply_to_message_id, caption: text, parse_mode }) :
                            bot.sendMessage(CHAT_ID, media, from_user ? { parse_mode } : { parse_mode, reply_to_message_id }))

        if (message_id) {
            p_success(type_m, messageId, id);
        }

    } catch (error) {
        logger.error(`Error forwarding user message from chat_id ${id} to chat_id ${CHAT_ID}: ${error.stack}`);
    }
}

const save_content = async (data) => {
    const { chat_id, agent_id, file_id } = data;
    const fileUrls = await getTelegramFiles()
}

/**
 * Forward messages from user chats to managers groups chat and
 * send back responses from managers to user chats 
 */
bot.on('message', async (message) => {

    logger.info(message);

    const { contact, chat: { id, type }, photo, document, voice, video, media_group_id, reply_to_message } = message;
    const from_id = message.from.id;
    const messageId = message.message_id;
    const save = ['Сохранить медиа', 'сохранить медиа'].includes(message.text);
    const is_manager = Object.values(managers_map).find(k => k === from_id) ? true : false;

    let text = message.text || message.caption || '';


    if (contact) return;

    const { partner_name, partner_id } = await get_partners_data(id);

    // process agent messages
    if (partner_name && partner_id) {

        await process_message({
            text,
            partner_name,
            partner_id,
            messageId,
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

    // process manager messages
    if (type === 'group' || type === 'supergroup') {
        const groupId = message.chat.id;
        logger.info(`Received a message from ${type} chat with ID: ${groupId}`);

        if (String(groupId) === GROUP_CHAT_ID) {

            if (reply_to_message && reply_to_message.from.is_bot && !save) {

                logger.info(reply_to_message);

                const manager_message_id = message.message_id;
                const { agent_id, agent_message_id, agent_name, chat_id } = parse_text(reply_to_message.text || reply_to_message.caption);

                await process_message({
                    text: message.text || message.caption || '',
                    messageId: manager_message_id,
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

                let media_data;

                const media = reply_to_message.photo ? reply_to_message.photo[0] :
                    reply_to_message.video ? reply_to_message.video :
                        reply_to_message.voice ? reply_to_message.voice :
                            reply_to_message.document ? reply_to_message.document : ''

                if (media !== '') {

                    const { agent_id, agent_message_id, agent_name, chat_id, media_id } = parse_text(reply_to_message.text || reply_to_message.caption);

                    const selectedData = Object.entries(media_files).find(([k, v]) => {
                        const [c_chat_id] = k.split("_");
                        return c_chat_id === chat_id && v.message_ids.includes(agent_message_id) && v.data && v.data.length > 0;
                    });

                    logger.info(selectedData);

                    media_data = selectedData ? selectedData.data : media.file_id;

                    logger.info(media_data);

                }
            }
        }
    }
});

/**
 * Parses the reply text to extract message ID, agent name, agent ID, and chat ID.
 * 
 * @param {string} replyText The text from the reply message.
 * @returns {object} An object containing the extracted information: agent ID, message ID, agent name, chat ID.
 */
const parse_text = (replyText) => {
    const hash = replyText.match(/hash:(.*)/)[1];
    const [agent_id, agent_message_id, chat_id, agent_name, media_id] = hash.split(':');
    // const data = stringToObjectdecryptString(hash, BOT_TOKEN));
    return { agent_id, agent_message_id, agent_name, chat_id, media_id };
}

/**
 * Asynchronously executes a task based on the send_media_obj object.
 * If the send_media_obj object contains keys, it calls the send_media_group function.
 * Otherwise, it logs a message indicating there are no media_group_files to send.
 * Sets a timeout to trigger the executeTask function again after a specified interval.
 */
async function executeTask() {
    if (Object.keys(send_media_obj).length > 0) {
        await send_media_group();
    }
    setTimeout(executeTask, interval);
}

executeTask();

/**
 * Function to check and delete data if a week has passed
 */
function checkAndDeleteOldData() {
    const now = new Date();
    for (const chatId in media_files) {
        const expirationDate = new Date(media_files[chatId].expiration_date);
        const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        if (now - expirationDate >= weekInMilliseconds) {
            logger.info(`Delete media_data after 7 days from chat_id: ${chatId}`);
            delete media_files[chatId];
        }
    }
}

setInterval(checkAndDeleteOldData, 24 * 60 * 60 * 1000); // Call every 24 hours

// Handle errors
bot.on('polling_error', (error) => {
    logger.error(error);
});

export { send_first_messages };