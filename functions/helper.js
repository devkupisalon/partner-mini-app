import bot from "./bot/init-bot.js";
import logger from "../logs/logger.js";
import { append_json_file } from "./process-json.js";
import { constants } from "../constants.js";
import crypto from "crypto";

const { calc_data_obj_path, MINI_APP_LINK } = constants;

/**
 * Возвращает номер столбца, содержащего указанное значение, на указанном листе.
 * @param {Sheet} sheet - Лист, на котором производится поиск.
 * @param {string} value - Значение, которое нужно найти.
 * @returns {number} - Номер столбца, где найдено значение. Если значение не найдено, возвращается -1.
 */
function getColumnNumberByValue(values, value) {
  // const row = values.find(row => row.includes(value));

  if (values) {
    const columnNumber = values.indexOf(value) + 1;
    return columnNumber;
  } else {
    return -1; // Если значение не найдено, возвращаем -1
  }
}

/**
 * Преобразует число в соответствующую строку столбца в таблице Google Sheets.
 * @param {number} n - Число для преобразования.
 * @return {string} - Строка с соответствующим значением столбца.
 */
function numberToColumn(n) {
  /* Google Sheets использует A = 1, мы вычисляем, начиная с 0 */
  if (n <= 0) n = 1;

  n -= 1;

  let ordA = "A".charCodeAt(0);
  let ordZ = "Z".charCodeAt(0);
  let len = ordZ - ordA + 1;

  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % len) + ordA) + s;
    n = Math.floor(n / len) - 1;
  }
  return s;
}

// Get file_id with high quality
const HQD_photo = (photo) =>
  photo.reduce((prev, current) =>
    prev.file_size > current.file_size ? prev : current
  );

/**
 * Prepares and extracts phone number, name, brand, model, and license plate number from the provided text.
 * @param {string} text - The text containing phone number, name, brand, model, and license plate number.
 * @returns {Object} - An object containing extracted phone number, name, brand, model, and license plate number.
 */
const prepare_calc = (text, is_include_groups = false) => {
  const parts = text.split(/\n+/);
  const [name, phone, brand, model, gosnum] = !is_include_groups ? parts.slice(1) : parts;
  return { phone, name, brand, model, gosnum };
};

/**
 * Parses the reply text to extract message ID, agent name, agent ID, and chat ID.
 *
 * @param {string} replyText The text from the reply message.
 * @returns {object} An object containing the extracted information: agent ID, message ID, agent name, chat ID.
 */
const parse_text = (replyText) => {
  const hash = replyText.match(/hash:(.*)/)[1];
  const [agent_id, agent_message_id, chat_id, agent_name, hash_id] =
    hash.split(":");
  return { agent_id, agent_message_id, agent_name, chat_id, hash_id };
};

/** Logger message */
const l_message = (l, id, to_id) => {
  return `${l} message successfully sended from chat_id ${id} to group_chat_id ${to_id}`;
};

const logger_messages = {
  media_group: (id, to_id) => l_message("Media Group", id, to_id),
  photo: (id, to_id) => l_message("Photo", id, to_id),
  video: (id, to_id) => l_message("Video", id, to_id),
  voice: (id, to_id) => l_message("Voice", id, to_id),
  document: (id, to_id) => l_message("Document", id, to_id),
  text: (id, to_id) => l_message("Text", id, to_id),
};

/**
 * Success function
 */
const p_success = async (m, reply_to_message_id, id, to_id) => {
  logger.info(logger_messages[m](id, to_id));
  await bot.sendMessage(id, "Сообщение отправлено", { reply_to_message_id });
};

/**
 * Process and save calculation data asynchronously.
 * @param {Object} data - The data object containing phone, name, brand, model, gosnum, and hash.
 * @returns {Promise<void>}
 */
const process_save_calc_data = async (data) => {
  let { phone, name, brand, model, gosnum, hash } = data;
  hash = hash.replaceAll(':', '-');
  const obj = {};
  if (!obj[hash]) {
    obj[hash] = { phone, name, brand, model, gosnum }
  }
  await append_json_file(calc_data_obj_path, obj);
};

/**
 * Function to generate a hexadecimal hash using current date and random number.
 * @returns {string} The generated hexadecimal hash.
 */
const generateHexHash = () => {
  const current_date = (new Date()).valueOf().toString();
  const random = Math.random().toString();
  return crypto.createHash('md5').update(current_date + random).digest('hex');
}

export {
  numberToColumn,
  getColumnNumberByValue,
  HQD_photo,
  parse_text,
  prepare_calc,
  p_success,
  process_save_calc_data,
  generateHexHash
};
