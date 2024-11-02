import { constants } from '../constants.js';
import logger from '../logs/logger.js';
import bot from './init-bot.js';
import { auth } from './sheets.js';

const { KUPISALONID } = constants;

// Функция для проверки подписки на канал и авторизации
const check_subscription = async (user_id) => {
    try {
        const chatMember = await bot.getChatMember(KUPISALONID, user_id);
        const is_subscribed = ['member', 'creator', 'administrator'].includes(chatMember.status);
        if (is_subscribed) {
            logger.info(`User with id: ${chatId} is subscribed`);
            return { is_subscribed };
        }
    } catch (error) {
        logger.error(error.stack);
        return { is_subscribed: false };
    }
};

/** CHECK SUBSCRIPTION AND AUTHORIZATION */
const check_subscription_and_authorization = async (params) => {
    const { user_id, partner } = params;
    const { is_subscribed } = await check_subscription(user_id);
    const { success, root } = await auth(user_id, partner);
    return { is_subscribed, is_authorized: { success, root } };
}

export { check_subscription_and_authorization };