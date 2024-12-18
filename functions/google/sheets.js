import gauth from "./google_auth.js";
import logger from "../../logs/logger.js";
import bot from "../bot/init-bot.js";

import { constants, __dirname, managers_map } from "../../constants.js";
import { numberToColumn, getColumnNumberByValue } from "../helper.js";
import { notify_manager_messages_map } from "../bot/messages.js";

import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import moment from 'moment-timezone';
import { create_folder } from "./drive.js";

const { sheets } = gauth();
const {
  SPREADSHEETID,
  SHEETNAME,
  DB,
  GROUPSSHEETNAME,
  DATASHEETNAME,
  VALUE,
  CARSSHEETNAME,
  CARSSPREADSHEET,
  MONITORSPREADSHEET,
  MONITORSHEETNAME,
  MAINSHEETNAME,
  FULLPRICECOLSTART,
  WEBAPPURL,
  parse_mode
} = constants;

/**
 * Получить данные из указанного диапазона в таблице Google Sheets
 * @param {string} spreadsheetId - Идентификатор таблицы Google Sheets
 * @param {string} range - Диапазон данных для извлечения
 * @returns {Array} - Массив значений из таблицы
 */
const get_data = async (spreadsheetId, range) => {
  const {
    data: { values },
  } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return values;
};

/**
 * Update data in a specific range of a Google Spreadsheet.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} range - The range in the spreadsheet to update.
 * @param {Object} requestBody - The request body containing the data to update.
 * @returns {Object} - The updated data.
 */
const update_data = async (spreadsheetId, range, requestBody) => {
  const { data } = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody,
  });
  return { data };
};

/**
 * Получить значения из указанного документа Google Sheets
 * @returns {Array} - Массив значений из указанной таблицы
 */
const get_values = async () => {
  try {
    const values = await get_data(DB, GROUPSSHEETNAME);

    logger.info("Data received successfully");
    return values;
  } catch (error) {
    logger.error(`Error in get_values: ${error.message}`);
  }
};

/**
 * Сохранить данные в указанную таблицу Google Sheets
 * @param {Object} params Объект с данными
 * @returns {boolean} - Успешно ли сохранены данные
 */
const save = async (params) => {
  try {
    const values = await get_data(SPREADSHEETID, SHEETNAME);
    let {
      timestamp,
      partner,
      user_id,
      username,
      name,
      phone,
      root,
    } = params;

    const arr = [
      timestamp,
      partner,
      user_id,
      username,
      name,
      phone,
      root || "",
    ];
    const requestBody = { values: [arr] };
    const range = `${SHEETNAME}!A${values.length + 1}`;

    const { data } = await update_data(SPREADSHEETID, range, requestBody);

    if (data.spreadsheetId) {
      logger.info("User data saved successfully");
      return true;
    }
  } catch (error) {
    logger.error(`Error in save: ${error.stack}`);
    return false;
  }
};

/**
 * Авторизация пользователя по ID и партнеру в таблице Google Sheets
 * @param {string} user_id - ID пользователя для авторизации
 * @param {string} partner - Партнер пользователя
 * @returns {boolean} - Успешно ли пользователь авторизован
 */
const auth = async (user_id, partner) => {
  try {
    const values = await get_data(SPREADSHEETID, SHEETNAME);

    const success =
      values
        .slice(1)
        .filter(
          (f) =>
            f[1] === partner && f[2] === user_id && f.slice(3, 6).every(Boolean)
        ) != "";

    const root =
      values
        .slice(1)
        .filter((f) => f[1] === partner && f[2] === user_id && f[6]) != "";

    if (success) {
      logger.info(`User with id: ${user_id} is authorized`);
      if (root) {
        logger.info(`User with id: ${user_id} have root premissions`);
      }
      return { success, root };
    } else {
      return { success: false, root: false };
    }
  } catch (error) {
    logger.error(`Error in auth: ${error.message}`);
  }
};

/**
 * Сохранить настройки в таблице Google Sheets
 * @param {object} obj - Объект с настройками для сохранения
 * @returns {boolean} - Успешно ли сохранены настройки
 */
const save_settings = async (obj) => {
  let range;

  try {
    let { partner, work_type, percent } = obj;
    const values = await get_data(DB, DATASHEETNAME);

    const arr = [work_type, percent || ""];
    const requestBody = { values: [arr] };

    const column_index = getColumnNumberByValue(values[0], VALUE);
    const column_letter = numberToColumn(column_index);
    const index = values.findIndex((v) => v[0] === partner);

    if (index !== -1) {
      range = `${DATASHEETNAME}!${column_letter}${index + 1}`;
    } else {
      logger.warn(`Partner with id: ${partner} not found in database`);
      return false;
    }

    const { data } = await update_data(DB, range, requestBody);

    if (data.spreadsheetId) {
      logger.info("Settings data saved successfully");
      return true;
    }
  } catch (error) {
    logger.error(`Error in save_settings: ${error.message}`);
    return false;
  }
};

/**
 * Получить настройки для указанного партнера
 * @param {string} partner - Идентификатор партнера, для которого нужно получить настройки
 * @returns {object|boolean} - Объект с настройками (work_type, percent) или false, если настройки не найдены
 */
const get_settings = async (partner) => {
  try {
    if (partner !== "null") {
      const values = await get_data(DB, DATASHEETNAME);
      const column_index = getColumnNumberByValue(values[0], VALUE) - 1;
      const data = values.find((r) => r[0] === partner);

      if (data !== "") {
        const percent =
          data.length >= column_index + 1 ? data[column_index + 1] : undefined;
        const work_type = data[column_index];
        if (work_type || (work_type && percent)) {
          logger.info(`Settings for partner with id: ${partner} found`);
          return { work_type, percent };
        } else {
          logger.warn(`Settings for partner with id: ${partner} not found`);
          return false;
        }
      }
    } else {
      logger.warn(`First init partner`);
      return false;
    }
  } catch (error) {
    logger.error(`Error in get_settings: ${error.stack}`);
    return false;
  }
};

/**
 * Выполнить расчет и сохранить данные в мониторинг Google Sheets
 * @param {object} params - Параметры для расчета и сохранения
 * @returns {string|boolean} - Ссылка на результат или false в случае ошибки
 */
const do_calc = async (params) => {
  const date = format(new Date(), "dd.MM.yyyy");
  const uid = uuidv4();
  const { partner, name, phone, brand, model, gosnum, folderId, chat_id, from_web_app } = params;
  let {
    partner_name,
    manager,
    work_type,
    percent,
    partner_folder,
    user_name
  } = await get_partners_data(chat_id);
  const arr = [
    uid,
    ...Array(5).fill(''),
    manager,
    brand,
    model,
    gosnum,
    ...Array(6).fill(''),
    name,
    phone,
    work_type,
    partner_name,
    ...Array(16).fill(''),
    date,
  ];

  partner_folder = folderId ? folderId : partner_folder;

  try {
    const values = await get_data(MONITORSPREADSHEET, MONITORSHEETNAME);
    const requestBody = { values: [arr] };
    const row = values.length + 1;
    const range = `${MONITORSHEETNAME}!A${row}`;

    const { data } = await update_data(MONITORSPREADSHEET, range, requestBody);

    if (data.spreadsheetId) {
      logger.info("Data for calculation saved successfully");
    }

    const linkResponse = await fetch(WEBAPPURL, {
      method: "POST",
      body: JSON.stringify({
        row,
        work_type,
        percent,
        partner_folder,
        partner,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (linkResponse.ok) {
      const link = await linkResponse.text();
      logger.info(`Received link: ${link}`);
      if (link) {
        logger.info(`Pre-order created successfully`);
        if (from_web_app === "true") {
          const date = moment();
          const timeZone = 'Europe/Moscow';
          const date_and_time = date.tz(timeZone).format('DD.MM.YYYY HH:mm:ss');
          const message_text = notify_manager_messages_map[work_type](user_name, partner_name, name, `${brand} ${model}`, date_and_time, link);
          const { message_id } = await bot.sendMessage(managers_map[manager], message_text, { parse_mode, disable_web_page_preview: true });
          if (message_id) {
            logger.info(`Pre_order notify maessage successfully sended to manager: ${manager}`);
          }
        }
      }
      return { link, folder_id: partner_folder };
    } else {
      logger.warn(
        "Error getting the link:",
        linkResponse.status,
        linkResponse.statusText
      );
    }
  } catch (error) {
    logger.error(`Error in do_calc: ${error.message}`);
    return false;
  }
};

/**
 * Получить данные о машинах из Google Sheets
 * @returns {Array} - Массив данных о машинах
 */
const get_cars = async () => {
  try {
    const values = await get_data(CARSSPREADSHEET, CARSSHEETNAME);
    logger.info("Data received successfully");
    return values;
  } catch (error) {
    logger.error(`Error in get_cars: ${error.message}`);
  }
};

/**
 * Сохранить данные о новом партнере
 * @param {object} params - Параметры нового партнера (org_name, address, phone, type, your_type, link, categories)
 * @returns {object} - Объект с идентификатором партнера и ссылкой на созданную папку, если данные сохранены успешно
 */
const save_new_partner = async (params) => {
  const uid = uuidv4();
  const {
    org_name,
    address,
    phone,
    type,
    your_type,
    link,
    categories,
    percent,
    user_id,
  } = params;
  const { folderLink, id } = await create_folder(org_name);

  try {
    const arr = [
      uid,
      org_name,
      ...Array(3).fill(''),
      link,
      address,
      , ,
      phone,
      categories || your_type,
      folderLink,
      ...Array(4).fill(''),
      type,
      percent || "",
      , ,
      user_id,
    ];
    const values = await get_data(DB, DATASHEETNAME);
    const row = values.findIndex((r) => r[0] === "") + 1;
    const range = `${DATASHEETNAME}!A${row}`;
    const requestBody = { values: [arr] };

    const { data } = await update_data(DB, range, requestBody);

    if (data.spreadsheetId) {
      logger.info("New partner data saved successfully");
      return { partner_id: uid, folder: id };
    }
  } catch (error) {
    logger.error(`Error in save_new_partner: ${error.message}`);
  }
};

/**
 * Получение данных о партнере по идентификатору чата
 * @param {string} chat_id - Идентификатор чата пользователя
 * @returns {object} - Объект с данными партнера
 */
const get_partners_data = async (chat_id) => {
  try {
    const values = await get_data(SPREADSHEETID, SHEETNAME);
    const headers = values[0];
    const acc_data = values
      .slice(1)
      .reduce((acc, row) => {
        if (row[2] === String(chat_id)) {
          row.forEach((r, i) => {
            if (i > 0) {
              let x = r;
              if (headers[i] === 'partner_folder') {
                x = x.split("/").pop();
              }
              acc[headers[i]] = x;
            }
          });
        }
        return acc;
      }, {});

    // const data_values = await get_data(DB, DATASHEETNAME);
    // const row = data_values.findIndex((r) => r[0] === partner_id) + 1;

    if (acc_data.partner_name && acc_data.partner_id) {
      logger.info(`User with id: ${chat_id} is authorized`);
      return acc_data;
    } else {
      logger.warn(`User with id: ${chat_id} is not authorized`);
      return { partner_name: undefined, partner_id: undefined };
    }
  } catch (error) {
    logger.error(`Error in get_partners_data: ${error.message}`);
  }
};

/**
 * Asynchronous function to check moderation status for a specific user.
 * @param {object} data - data for check moderation.
 */
const check_moderation = async (data) => {
  const { user_id, partner_id } = data;
  try {
    const values = await get_data(DB, DATASHEETNAME);
    const { check_col, root_id_col, server_check_col } = [
      "check",
      "root_id",
      "server_check",
    ].reduce((acc, k) => {
      acc[`${k}_col`] = getColumnNumberByValue(values[0], k) - 1;
      return acc;
    }, {});

    const success_values = values.find(
      (r) => r[root_id_col] === user_id || r[0] === partner_id
    );

    if (success_values !== undefined) {
      const {
        0: uid,
        1: name,
        [check_col]: check,
        [root_id_col]: root_id,
        [server_check_col]: check_server,
      } = success_values;

      if (check_server === "TRUE") {
        logger.info(`Moderation for partner ${name} with id ${uid} and user_id ${user_id} is completed`);
        return { true: true, uid };
      } else if (root_id && check === "FALSE") {
        logger.warn(`Moderation for root_user_id ${user_id} is not completed`);
        return "moderation";
      }
    } else {
      logger.info(`User with id ${user_id} not found in data base`);
      return false;
    }
  } catch (error) {
    logger.error(`Error in check_moderation: ${error.stack}`);
  }
};

/**
 * Function to check successful moderation.
 * @returns {Promise<Object>} - Object containing data for successful moderation or an empty object.
 */
const check_success_moderation = async () => {
  try {
    const values = await get_data(DB, DATASHEETNAME);

    // Get column numbers for specific columns
    const {
      check_col,
      root_id_col,
      server_check_col,
      work_type_col,
      group_id_col,
      manager_chat_id_col,
    } = [
      "check",
      "server_check",
      "root_id",
      "work_type",
      "group_id",
      "manager_chat_id",
    ].reduce((acc, k) => {
      acc[`${k}_col`] = getColumnNumberByValue(values[0], k) - 1;
      return acc;
    }, {});

    // Convert server_check_col to column letter
    const col_letter = numberToColumn(server_check_col + 1);

    // Extract relevant data into an object
    const data_obj = values.slice(1).reduce((acc, r, i) => {
      const {
        0: uid,
        1: name,
        [check_col]: check,
        [root_id_col]: root_id,
        [server_check_col]: check_server,
        [work_type_col]: type,
        [group_id_col]: group_id,
        [manager_chat_id_col]: manager_chat_id,
      } = r;

      // Check conditions for successful moderation
      if (check === "TRUE" && check_server === "FALSE" && root_id) {
        acc[uid] = {
          chat_id: root_id,
          type,
          uid,
          i: i + 2,
          col_letter,
          group_id,
          manager_chat_id,
          name,
        };
      }
      return acc;
    }, {});

    // Return the data object if it has entries, otherwise return an empty object
    if (Object.keys(data_obj).length > 0) {
      return data_obj;
    } else {
      return {};
    }
  } catch (error) {
    logger.error(`Error in check_success_moderation: ${error.stack}`);
  }
};

/**
 * Function to get all group IDs.
 * @returns {Promise<Object>} - Object containing group IDs.
 */
const get_all_groups_ids = async () => {
  try {
    const values = await get_data(DB, DATASHEETNAME);
    if (values) {
      const group_id_col = getColumnNumberByValue(values[0], "group_id");
      const group_ids = values.slice(1).filter((r) => r[group_id_col + 1]);
      const group_ids_obj = group_ids.reduce((acc, r, i) => {
        const group_id = r[group_id_col - 1];
        if (group_id !== "") {
          acc[`-${group_id}`] = i;
          acc[`-100${group_id}`] = i;
        }
        return acc;
      }, {});

      return group_ids_obj;
    }
  } catch (error) {
    logger.info(`Error in get_all_groups: ${error.stack}`);
  }
};

/**
 * Retrieves data from a Google Sheets document and processes it to extract specific information based on a given partner ID.
 * @param {Object} data - The ID of the partner to calculate pricing for.
 * @returns {Object} An object containing the processed data adjusted based on the partner's percentage and header row.
 */
const getData = async (data) => {
  try {
    const header_value = "Розница";
    const header_percent_value = "percent";

    const partners_values = await get_data(DB, DATASHEETNAME);
    const percent_col = getColumnNumberByValue(
      partners_values[0],
      header_percent_value
    );

    const row = partners_values
      .slice(1)
      .find((r) => r[0] === data.partner);
    const partner_percent = row[percent_col - 1];
    const percentage = parseFloat(partner_percent.replace("%", "").replace(",", ".")) / 100 + 1;
    const values = await get_data(CARSSPREADSHEET, MAINSHEETNAME);
    const header_value_col = getColumnNumberByValue(
      values.slice(FULLPRICECOLSTART - 2)[0],
      header_value
    );

    const header_row = ["№", "Наименование", "Цена"];

    const data_obj = values
      .slice(FULLPRICECOLSTART - 1)
      .reduce((acc, r, index) => {
        const [, i, , name, , zap] = r;
        const rawPrice = r[header_value_col - 1] * percentage;
        const price = parseFloat(rawPrice + Number(zap)).toFixed(0);

        if (!acc.values) acc.values = [];
        if (i) {
          acc.values.push({
            i,
            name,
            price,
          });
        } else {
          acc.values.push({
            name,
            index,
            color: true,
          });
        }
        return acc;
      }, {});

    Object.assign(data_obj, { header_row });
    return data_obj;
  } catch (error) {
    logger.info(`Error in get_price_data: ${error.stack}`);
  }
}

export {
  update_data,
  get_values,
  save,
  auth,
  save_settings,
  get_settings,
  get_cars,
  do_calc,
  save_new_partner,
  get_partners_data,
  check_moderation,
  check_success_moderation,
  get_all_groups_ids,
  getData,
};


