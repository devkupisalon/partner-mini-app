import bot from './init-bot.js';
import logger from '../logs/logger.js';
import { constants } from '../constants.js';

const { DEV_CHAT_ID, GROUP_CHAT_ID } = constants;
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

const send_first_message = async (chat_id) => {
    bot.sendMessage(chat_id, 'Выберите действие:', { reply_markup: JSON.stringify(keyboard) })
        .then(() => {
            logger.info('Message with buttons successfully sent to the user');
        })
        .catch((error) => {
            logger.error(`Error sending message with buttons: ${error.message}`);
        });
}

// Handler for callback_data "send_calculation_info"
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const { partner_name, partner_id } = await get_partners_data(chatId);

    if (query.data === send_data) {
        bot.sendMessage(chatId, 'Пожалуйста, отправьте данные для расчета: фото/видео/текст/голосовое сообщение одним сообщением.')
            .then(() => {
                logger.info(`User ${partner_name} (ID: ${partner_id}) is prompted to send data for calculation.`);
            })
            .catch((error) => {
                logger.error(`Error sending request for data for calculation: ${error.message}`);
            });
    } else if (query.data === report_error) {
        bot.sendMessage(chatId, 'Пожалуйста, отправьте фото/видео/текст/голосовой контент ошибки одним сообщением.')
            .then(() => {
                logger.info(`User ${partner_name} (ID: ${partner_id}) is prompted to send an error message.`);
            })
            .catch((error) => {
                logger.error(`Error sending request for error message: ${error.message}`);
            });
    }

    // Handling received data and forwarding it to a specific chat ID (for "send_calculation_info" and "report_error")
    bot.on('message', (message) => {
        const targetChatId = (query.data === send_data) ? GROUP_CHAT_ID : DEV_CHAT_ID;
        // Подготовка текста для простой пересылки сообщения с именем партнера и его ID
        const forwardedMessage = `Сообщение от партнера ${partner_name} (ID: ${partner_id}):`;
        // Пересылка сообщения с подгтовленным текстом и данными
        bot.forwardMessage(targetChatId, chatId, message.message_id, forwardedMessage);
    });
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
                { text: 'Сформировать расчет', url }
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