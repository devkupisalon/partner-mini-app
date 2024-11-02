import bot from './init-bot.js';
import logger from '../logs/logger.js';
import { constants, messages_map } from '../constants.js';
import { get_partners_data } from './sheets.js';

let { GROUP_CHAT_ID } = constants;
GROUP_CHAT_ID = `-100${GROUP_CHAT_ID}`;

/**
 * Send first init messages to user
 * @param {string} chat_id - user chat_id 
 * @param {string} type - Agent or Partner
 * @param {string} uid - Partner ID
 */
const send_first_messages = async (chat_id, type, uid) => {
    try {
        await Object.keys(messages_map).forEach(async (k) => {
            const { link, file, to_pin } = messages_map[k];
            if (messages_map[k][type]) {

                const { url, text, document, caption, button_text } = messages_map[k][type];
                const create_url = typeof url === 'function' ? url : (uid) => { uid };
                const messageOptions = {
                    link: {
                        message_text_option: text,
                        reply_markup: { inline_keyboard: [[{ text: button_text, url: create_url(uid) }]] }
                    },
                    file: {
                        document,
                        caption
                    },
                    text: {
                        message_text_option: text
                    }
                };

                const messageType = link ? 'link' : file ? 'file' : 'text';
                logger.info(messageType);
                const { message_text_option, caption_option, reply_markup, document_option } = messageOptions[messageType];

                const { message_id } = await (link ?
                    bot.sendMessage(chat_id, message_text_option, reply_markup) :
                    file ? bot.sendDocument(chat_id, document_option, { caption: caption_option }) :
                        bot.sendMessage(chat_id, message_text_option));

                if (message_id) {
                    logger.info('Message successfully sent to the user');
                    if (to_pin) {
                        await bot.pinChatMessage(chat_id, message_id);
                        logger.info(`Message with id ${message_id} successfully pinned`);
                    }
                    return { success: true };
                }
            }
        });
    } catch (error) {
        logger.error(`Error sending messages: ${error.message}`);
        return { succces: false };
    }
}

/**
 * Forward messages from user chats to managers groups chat and
 * send back responses from managers to user chats 
 */
bot.on('message', async (message) => {
    const { contact, chat: { id, type } } = message;
    const messageId = message.message_id;
    if (contact) return;

    if (message.from.id === id) {
        if (id) {
            const { partner_name, partner_id } = await get_partners_data(id);
            if (partner_name && partner_id) {
                try {
                    const { message_id } = await bot.forwardMessage(GROUP_CHAT_ID, id, messageId);
                    if (message_id) {
                        logger.info(`Message successfully forwarded from chat_id ${id} to group_chat_id ${GROUP_CHAT_ID}`);
                        await bot.sendMessage(id, 'Сообщение отправлено', { reply_to_message_id: messageId });
                    }

                } catch (error) {
                    logger.error(`Error forwarding user message from chat_id ${id} to group_chat_id ${GROUP_CHAT_ID}: ${error.stack}`);
                }
            }
        }
    }

    if (type === 'group' || type === 'supergroup') {
        const groupId = message.chat.id;
        logger.info(`Received a message from group chat with ID: ${groupId}`);

        if (String(groupId) === GROUP_CHAT_ID) {

            if (message.reply_to_message && message.reply_to_message.forward_from) {
                const userChatId = message.reply_to_message.forward_from.id;

                try {
                    const { message_id } = await bot.forwardMessage(userChatId, id, messageId);
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

// Handle errors
bot.on('polling_error', (error) => {
    logger.error(error);
});

export { send_first_messages };