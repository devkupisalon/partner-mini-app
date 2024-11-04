import bot from './init-bot.js';
import logger from '../logs/logger.js';
import { constants, invite_texts_map, messages_map } from '../constants.js';
import { get_partners_data } from './sheets.js';
import cron from 'node-cron';

let { GROUP_CHAT_ID } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

const parse_mode = 'Markdown';

let send_media_obj = {};

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

/** Success function */
const p_success = async (m, reply_to_message_id, id) => {
    logger.info(logger_messages[m](id));
    await bot.sendMessage(id, 'Сообщение отправлено', { reply_to_message_id });
}

/** Send media group */
const send_media_group = async () => {

    try {
        if (Object.keys(send_media_obj).length > 0) {
            const mediaObjValues = Object.values(send_media_obj);

            for (let i = 0; i < mediaObjValues.length; i++) {
                const currentMediaObj = mediaObjValues[i];

                const { caption, mediaFiles, messageId, id } = currentMediaObj;

                const mediaGroup = mediaFiles.map(({ type, media }, index) => {
                    if (index === 0) {
                        return { type, media, caption, parse_mode };
                    }
                    return { type, media };
                });

                const message = await bot.sendMediaGroup(GROUP_CHAT_ID, mediaGroup);

                if (message) {
                    p_success('media_group', messageId, id);

                    // Удаление обработанного объекта
                    delete send_media_obj[Object.keys(send_media_obj)[i]];
                }
            }
        }
    } catch (error) {
        logger.error(`Error in send_media_group: ${error}`);
    }
}

/**
 * Forward messages from user chats to managers groups chat and
 * send back responses from managers to user chats 
 */
bot.on('message', async (message) => {

    const { contact, chat: { id, type }, photo, document, voice, video, media_group_id } = message;
    const messageId = message.message_id;

    let text = message.text || message.caption || '';

    if (contact) return;

    const { partner_name, partner_id } = await get_partners_data(id);

    if (partner_name && partner_id) {

        text = `Агент *${partner_name}*:\n\n${text}\n\nID:${partner_id}\n*message_id*:{${messageId}}\n`;

        const type_m = photo ? 'photo' : video ? 'video' : voice ? 'voice' : document ? 'document' : 'text';
        const media = photo ? photo[0].file_id : video ? video.file_id : voice ? voice.file_id : document ? document.file_id : text;

        logger.info(message);

        if (media_group_id) {
            if (!send_media_obj[id]) send_media_obj[id] = { messageId, media_group_id, id, mediaFiles: [] };
            message.caption ?
                send_media_obj[id].caption = `Агент *${partner_name}*:\n\n${message.caption}\n\nID:${partner_id}\n*message_id*:{${messageId}}\n` : '';
            photo ? send_media_obj[id].mediaFiles.push({ type: 'photo', media: media }) :
                video ? send_media_obj[id].mediaFiles.push({ type: 'video', media: media }) :
                    voice ? send_media_obj[id].mediaFiles.push({ type: 'voice', media: media }) :
                        document ? send_media_obj[id].mediaFiles.push({ type: 'document', media: media }) : '';

            logger.info(`Media files prepeared to send: ${JSON.stringify(send_media_obj[id])}`);
            return;
        }

        try {

            const { message_id } = await (
                type_m === 'photo' ? bot.sendPhoto(GROUP_CHAT_ID, media, { caption: text, parse_mode }) :
                    type_m === 'video' ? bot.sendVideo(GROUP_CHAT_ID, media, { caption: text, parse_mode }) :
                        type_m === 'voice' ? bot.sendVoice(GROUP_CHAT_ID, media, { caption: text, parse_mode }) :
                            type_m === 'document' ? bot.sendDocument(GROUP_CHAT_ID, media, { caption: text, parse_mode }) :
                                bot.sendMessage(GROUP_CHAT_ID, text, { parse_mode }))

            if (message_id) {
                p_success(type_m, messageId, id);
            }

        } catch (error) {
            logger.error(`Error forwarding user message from chat_id ${id} to group_chat_id ${GROUP_CHAT_ID}: ${error.stack}`);
        }
    }

    if (type === 'group' || type === 'supergroup') {
        const groupId = message.chat.id;
        logger.info(`Received a message from ${type} chat with ID: ${groupId}`);
        logger.info(String(groupId));
        logger.info(GROUP_CHAT_ID);

        if (String(groupId) === GROUP_CHAT_ID) {

            if (message.reply_to_message && message.reply_to_message.forward_from) {

                const origin_message_id = message.reply_to_message.message_id;
                logger.info(origin_message_id);
                const userChatId = message.reply_to_message.forward_from.id;

                try {
                    const { message_id } = await bot.forwardMessage(userChatId, id, messageId, { reply_to_message_id: origin_message_id });
                    if (message_id) {
                        logger.info(`Message successfully sent from manager in chat_id ${id} to user in chat_id ${userChatId}`);
                        await bot.sendMessage(id, 'Сообщение отправлено', { reply_to_message_id: messageId });
                    }
                } catch (error) {
                    logger.error(`Error sending message from manager in chat_id ${id} to user in chat_id ${userChatId}: ${error.stack}`);

                }
            }
        }
    }
});


const interval = 5000; // Интервал в миллисекундах (10 секунд)

async function executeTask() {
    if (Object.keys(send_media_obj).length > 0) {
        await send_media_group();
    } else {
        logger.info(`There are no media_group_files to send`);
    }
    setTimeout(executeTask, interval); // Повторный запуск через указанный интервал
}

// Начальный запуск задачи
executeTask();

// Handle errors
bot.on('polling_error', (error) => {
    logger.error(error);
});

export { send_first_messages };