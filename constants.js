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
    DATASHEETNAME: process.env.datasheetname,
    VALUE: process.env.value,
    CARSSHEETNAME: process.env.carssheetname,
    CARSSPREADSHEET: process.env.CARSSPREADSHEET,
    MONITORSHEETNAME: process.env.monitorsheetname,
    MONITORSPREADSHEET: process.env.MONITORSPREADSHEET,
    HOME: `${__dirname}/html/mini-app-main.html`,
    AUTH: `${__dirname}/html/auth-web-app.html`,
    SETTINGS: `${__dirname}/html/settings-web-app.html`,
    PRE_CALC: `${__dirname}/html/pre-calculation.html`
};

export { constants, __dirname };