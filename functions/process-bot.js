import bot from './init-bot.js';
import logger from '../logs/logger.js';
import { constants } from '../constants.js';
import { get_partners_data } from './sheets.js';

const { GROUP_CHAT_ID } = constants;
const callback_data = {
    report_error: 'report_error',
    send_data: 'send_calculation_info'
};

const { report_error, send_data } = callback_data;

const keyboard = {
    inline_keyboard: [
        [{ text: 'Отправить информацию для расчета', callback_data: send_data }],
        [{ text: 'Сообщить об ошибке', callback_data: report_error }]
    ]
};

/**
 * Send first message to user
 * @param {string} chat_id - user chat_id 
 */
const send_first_message = async (chat_id) => {
    bot.sendMessage(chat_id, 'Пожалуйста, отправляйте данные для расчета: фото/видео/текст/голосовой контент одним сообщением.')
        .then(() => {
            logger.info('Message successfully sent to the user');
        })
        .catch((error) => {
            logger.error(`Error sending message: ${error.message}`);
        });
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
            // const forwardedMessage = `Сообщение от партнера ${partner_name} (ID: ${partner_id}):`;
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

    if (type === 'group' || type === 'supergroup') {
        const groupId = message.chat.id;
        logger.info(`Received a message from group chat with ID: ${groupId}`);

        if (groupId === GROUP_CHAT_ID) {

            if (message.reply_to_message && message.reply_to_message.forward_from) {
                const userChatId = message.reply_to_message.forward_from.id;

                try {
                    const { message_id } = await bot.forwardMessage(userChatId, id, messageId)
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

/**
 * Функция для закрепления сообщения с кнопкой в чате
 * 
 * @param {number} chat_id - ID чата, куда отправить и закрепить сообщение
 * @param {string} text - Текст сообщения для отправки
 * @param {string} url - URL-адрес для кнопки в сообщении
 */
const pinned_message = async (chat_id, text, url) => {

    // Отправить сообщение с кнопкой и закрепить его
    const pinnedMessage = await bot.sendMessage(chat_id, text, {
        reply_markup: {
            inline_keyboard: [[
                { text: 'Сделать расчет', url }
            ]]
        }
    });

    const messageId = pinnedMessage.message_id;

    try {
        await bot.pinChatMessage(chat_id, messageId);

        logger.info(`Message successfully pinned in chat with ID: ${chat_id}`);
    } catch (error) {
        logger.error(`Error while pinned message in chat with ID ${chat_id}: ${error.message}`);
    }
}

export { send_first_message, pinned_message };