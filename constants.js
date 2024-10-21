import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const constants = {
    BOT_TOKEN: process.env.bot_token,
    KUPISALONID: process.env.kupisalonID,
    SPREADSHEETID: process.env.spreadsheetID,
    DB: process.env.DBPARTNERS,
    SHEETNAME: process.env.sheetName,
    GROUPSSHEETNAME: process.env.groups_sheetname,
    HOME: `${__dirname}/html/mini-app-main.html`,
    AUTH: `${__dirname}/html/auth-web-app.html`,
};

export { constants, __dirname };