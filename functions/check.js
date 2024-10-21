import { constants } from '../constants.js';
import logger from '../logs/logger.js';
import bot from '../functions/init-bot.js';

const { KUPISALONID } = constants;

// Функция для проверки подписки на канал
const subscription = async (chatId) => {
    try {
        const chatMember = await bot.getChatMember(KUPISALONID, chatId);
        return ['member', 'creator', 'administrator'].includes(chatMember.status);
    } catch (error) {
        logger.error(error.message);
        return false;
    }
};

export { subscription };