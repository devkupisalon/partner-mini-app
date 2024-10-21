import TelegramBot from 'node-telegram-bot-api';
import { constants } from '../constants.js';

const { BOT_TOKEN } = constants;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

export default bot;