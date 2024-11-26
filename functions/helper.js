import bot from "./bot/init-bot.js";
import logger from "../logs/logger.js";
import { append_json_file } from "./process-json.js";
import { constants } from "../constants.js";
import { get_partners_data } from "./google/sheets.js";
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

/**
 * Function to extract hash from a message based on certain conditions.
 * 
 * @param {Object} message - The message object containing text and entities.
 * @param {boolean} is_manager - Flag indicating if the user is a manager.
 * @param {boolean} is_include_groups - Flag indicating if groups are included in the message.
 * @returns {string|null} - The extracted hash or null.
 */
const get_hash = (message, is_manager, is_include_groups) => {
  const is_hash = is_manager && message.text && !is_include_groups && message.entities
    ? decodeURI(message.entities[0].url.toString().replace(MINI_APP_LINK, '')).match(/hash:(.*)/)
    : is_manager && message.text && !is_include_groups && !message.entities
      ? message.text.match(/hash:(.*)/)
      : '';
  const hash = is_hash ? `${is_hash[1].replaceAll(':', '-')}` : '';
  return hash ? hash : null;
};

/**
 * Function to analyze data and return conditions based on the provided parameters.
 * 
 * @param {Object} data - The data object containing various message details.
 * @returns {Object} - Returns an object with various conditions based on the data.
 */
const return_conditions = (data) => {
  const {
    from_id,
    type,
    message,
    reply_to_message,
    id,
    photo,
    video,
    voice,
    document,
    media_group_id,
    group_title,
    group_ids_obj,
    GROUP_CHAT_ID,
    managers_map,
  } = data;

  const is_manager = Object.values(managers_map).find((k) => k === from_id)
    ? true
    : false;

  const is_group = ["group", "supergroup"].includes(type);
  const is_bot = reply_to_message?.from.is_bot || message.from.is_bot;
  const is_managers_work_chat = String(id) === GROUP_CHAT_ID; // main managers group

  const is_media =
    photo ||
    video ||
    voice ||
    document ||
    media_group_id;

  const save = is_manager ? ['Сохранить', 'сохранить'].some(v => message.text?.includes(v)) : '';
  const calc = is_manager ? ['Расчет', 'расчет'].some(v => message.text?.includes(v)) : '';
  const is_include_groups = group_ids_obj.hasOwnProperty(id);
  const is_title = reply_to_message?.chat?.title?.includes(group_title);
  const is_hash_folder_id = is_manager && reply_to_message
    ? (!is_include_groups ? reply_to_message : message).text?.match(/hash_folder:(.*)/)
    : '';
  const is_text_to_parse = reply_to_message && !calc && !save && (message.entities || reply_to_message.entities || reply_to_message.caption_entities);

  return {
    is_manager,
    is_group,
    is_bot,
    is_managers_work_chat,
    is_media,
    save,
    calc,
    is_title,
    is_hash_folder_id,
    is_include_groups,
    is_text_to_parse
  }
};

/** 
 * Function to get the media and mime type based on the provided photo, video, voice, and document.
 * @param {object} photo - The photo object.
 * @param {object} video - The video object.
 * @param {object} voice - The voice object.
 * @param {object} document - The document object.
 * @returns {object} An object containing the media and mime type.
 */
const get_media_and_mime_type = (photo, video, voice, document, flag = false, text = "") => {
  // Determine the media based on photo, video, voice, and document.
  const media = photo ? HQD_photo(photo).file_id :
    video ? video.file_id :
      voice ? voice.file_id :
        document ? document.file_id :
          text !== "" ? text : "";

  // Determine the mime type based on the type of media.
  const mime_type = photo ? "image/png" :
    video ? video.mime_type :
      voice ? voice.mime_type :
        document ? document.mime_type : "";

  const type_m = photo ? "photo" :
    video ? "video" :
      voice ? "voice" :
        document ? "document" : "text";

  // Return the media and mime type as an object.
  return flag ? { media, mime_type } : { media, type_m };
};

/** 
 * Function to define the success condition based on provided data.
 * @param {object} data - The data object containing chat_id, c_chat_id, v, d, hash_id, reply_to_message_id, hash, is_include_groups, is_bot.
 * @returns {boolean} The success condition evaluation based on the data.
 */
const return_success_condition = (data) => {
  const { chat_id, c_chat_id, v, d, hash_id, reply_to_message_id, hash, is_include_groups, is_bot, } = data;
  if (v.hash_partner && !hash_id && !is_bot) {
    if (!is_include_groups) {
      return (
        c_chat_id === d.chat_id &&
        hash === d.hash_id &&
        v.data &&
        v.data.length > 0
      );
    } else {
      return (
        c_chat_id === d.chat_id &&
        hash === d.hash_id &&
        v.data &&
        v.data.length > 0 &&
        v.message_ids.some(id => id === reply_to_message_id)
      )
    }
  } else {
    return (
      c_chat_id === chat_id &&
      v.hash_id === hash_id &&
      v.data &&
      v.data.length > 0
    );
  }
};

/** 
 * Arrow function to initialize the media files entry with default values.
 * @param {string} hash_id - The hash id for the media entry.
 * @param {string} hash_partner - The hash partner for the media entry (optional).
 * @returns {object} An object with initialized media files entry.
 */
const initialize_media_files_entry = (hash_id, hash_partner = null) => ({
  data: [],
  message_ids: [],
  experation_date: new Date().toISOString(),
  hash_id,
  hash_partner,
});

/**
 * Retrieves partner data based on the provided parameters.
 * 
 * @param {object} data - An object containing userID, message, calc, and is_include_groups.
 * @returns {object} - An object containing partner data: partner_id, partner_name, row, partner_folder.
 */
const get_fast_partner_data = async (data) => {
  let { user_ID, message, calc, is_include_groups, is_manager } = data;
  let partner_id, partner_name, row, partner_folder;
  const calc_condition = message.entities && calc;

  // Check conditions to fetch partner data
  if (!is_manager || (is_manager && is_include_groups) || (calc_condition)) {
    // Extract chatID based on conditions
    const chatID = calc_condition ? parse_text(decodeURI(message.entities[0].url.toString().replace(MINI_APP_LINK, ''))).chat_id : user_ID;
    const p = await get_partners_data(chatID);
    partner_id = p.partner_id;
    partner_name = p.partner_name;
    row = p.row;
    partner_folder = p.partner_folder;
  }

  return { partner_id, partner_name, row, partner_folder };
};

export {
  numberToColumn,
  getColumnNumberByValue,
  HQD_photo,
  parse_text,
  prepare_calc,
  p_success,
  process_save_calc_data,
  generateHexHash,
  get_hash,
  return_conditions,
  get_media_and_mime_type,
  initialize_media_files_entry,
  return_success_condition,
  get_fast_partner_data
};
