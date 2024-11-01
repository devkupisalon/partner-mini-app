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

    if (message.contact) {
        return;
    }

    const chatId = message.chat.id;

    // Если сообщение от пользователя
    if (message.from.id === chatId) {
        if (chatId) {
            const { partner_name, partner_id } = await get_partners_data(chatId);
            const forwardedMessage = `Сообщение от партнера ${partner_name} (ID: ${partner_id}):`;
            logger.info(`group_id: ${GROUP_CHAT_ID}, chat_id: ${chatId}, message_id: ${message.message_id}`);
            bot.forwardMessage(GROUP_CHAT_ID, chatId, message.message_id)
                .then(() => {
                    logger.info(`User message successfully forwarded from chat_id ${chatId} to group_chat_id ${GROUP_CHAT_ID}`);
                })
                .catch((error) => {
                    logger.error(`Error forwarding user message from chat_id ${chatId} to group_chat_id ${GROUP_CHAT_ID}: ${error.message}`);
                });
        }
    }

    // Проверка, откуда получено сообщение (если из чата группы)
    if (message.chat.type === 'group' || message.chat.type === 'supergroup') {
        const groupId = message.chat.id;
        logger.info(`Received a message from group chat with ID: ${groupId}`);

        if (groupId === GROUP_CHAT_ID) {

            // Проверка на наличие пересланного сообщения от пользователя
            if (message.reply_to_message && message.reply_to_message.forward_from) {
                const userChatId = message.reply_to_message.forward_from.id;

                // Пересылка ответа от менеджера обратно пользователю
                bot.forwardMessage(userChatId, chatId, message.message_id)
                    .then(() => {
                        logger.info(`Message successfully sent from manager in chat_id ${chatId} to user in chat_id ${userChatId}`);
                    })
                    .catch((error) => {
                        logger.error(`Error sending message from manager in chat_id ${chatId} to user in chat_id ${userChatId}: ${error.message}`);
                    });
            }
        }

    }
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