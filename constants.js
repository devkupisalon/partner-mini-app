import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let managers_map;

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
  MAINSHEETNAME: process.env.mainsheetname,
  FULLPRICECOLSTART: process.env.fullPriceColStart,
  PARTNERSPARENT: process.env.partnersparent,
  WEBAPPURL: process.env.webappurl,
  GROUP_CHAT_ID: process.env.GROUP_CHAT_ID,
  MINI_APP_LINK: process.env.MINI_APP_LINK,
  PDF_LINK: process.env.PDF_LINK,
  DBLINK: process.env.DBLINK,
  DOCUMENT_ID_PRIVATE_POLiCY: process.env.PRIVATE_POLICY_ID,
  HOME: `${__dirname}/html/mini-app-main.html`,
  AUTH: `${__dirname}/html/auth-web-app.html`,
  SETTINGS: `${__dirname}/html/settings-web-app.html`,
  PRE_CALC: `${__dirname}/html/pre-calculation.html`,
  REGISTR: `${__dirname}/html/registration.html`,
  PRICE: `${__dirname}/html/price.html`,
  send_media_obj_path: `${__dirname}/json/send_media_obj.json`,
  media_files_obj_path: `${__dirname}/json/media_files_obj.json`,
  managers_map_obj_path: `${__dirname}/json/managers_ids.json`,
  calc_data_obj_path: `${__dirname}/json/calc_data_obj.json`,
  agent_messages_obj_path: `${__dirname}/json/agetn_messages_obj.json`,
  credentials_path: `${__dirname}/json/credentials.json`,
  parse_mode: "Markdown",
  DEV_MODE: process.env.DEV_MODE === 'false' ? false : true,
  BOT_ID: process.env.BOT_ID
};

fs.readFile(constants.managers_map_obj_path, "utf8", (err, data) => {
  if (err) {
    logger.error(`Error in reda_json_file: ${err}`);
    return;
  }
  const jsonData = JSON.parse(data);
  managers_map = jsonData;
});

export { constants, __dirname,  managers_map };
