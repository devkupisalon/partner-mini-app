import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants, managers_map } from "../../constants.js";
import { get_partners_data, get_all_groups_ids } from "../sheets.js";
import { parse_text } from "../helper.js";
import { process_save_media_to_obj, send_media_group } from "./process-media-group.js";
import { process_message } from "./process-message.js";
import { process_calc, process_save } from "./process-google.js";
import { deletePropertiesFromFile, process_return_json } from "../process-json.js";

const interval = 10000;

let { GROUP_CHAT_ID } = constants;
let isProcessMessageRunning;
const { send_media_obj_path, DBLINK, DEV_MODE } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

/**
 * Process forward,reply messages between managers and partners or agents
 * Save media content to google drive folders
 * Create pre-orders for partners/agents
 * 
 * Supports batch transfer of media content and its storage
 */
bot.on("message", async (message) => {

  const {
    contact,
    chat: { id, type },
    photo,
    document,
    voice,
    video,
    media_group_id,
    reply_to_message,
    message_id,
    forward_from,
  } = message;

  const from_id = message.from.id;
  const group_ids_obj = await get_all_groups_ids();
  const text_to_parse = reply_to_message?.text || reply_to_message?.caption;

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
  const is_hash_folder_id = is_manager && reply_to_message
    ? (!is_include_groups ? reply_to_message : message).text?.match(/hash_folder:(.*)/)
    : '';
  const hash_folder_id = is_hash_folder_id ? is_hash_folder_id[1] : '';
  const is_hash = is_manager && message.text && !is_include_groups ? message.text?.match(/hash:(.*)/) : '';
  const hash = is_hash ? `${is_hash[1].replaceAll(':', '-')}\n` : '';

  const group_title = !DEV_MODE ? `Купи салон Рабочая` : 'PARTNER_SERVICE';
  const is_title = reply_to_message?.chat?.title.includes(group_title);

  let text = message.text || message.caption || "";
  let partner_name, partner_id, row;

  let user_ID =
    reply_to_message && is_manager && is_group
      ? reply_to_message?.from.id
      : is_group
        ? from_id
        : id;

  if (contact) return;

  // Get partners/agents data from sheet
  if (!is_manager) {
    const p = await get_partners_data(user_ID);
    partner_id = p.partner_id;
    partner_name = p.partner_name;
    row = p.row;
  } else if (is_manager && is_include_groups) {
    const p = await get_partners_data(user_ID);
    partner_id = p.partner_id;
    partner_name = p.partner_name;
    row = p.row;
  }

  const partner_url = `${DBLINK}&range=${row}:${row}`;

  // Process agent messages
  if (partner_name && partner_id && !is_group && !is_bot && !is_manager) {
    isProcessMessageRunning = true;
    await process_message({
      text,
      partner_name,
      partner_id,
      message_id,
      id,
      photo,
      video,
      voice,
      document,
      media_group_id,
      message,
      from_user: true,
      row,
    });
    isProcessMessageRunning = false;
  }

  // process save media to json if is media send from partner/agent in group
  if (is_group && partner_id && partner_name && media_group_id) {
    const hash_id = uuidv4();
    const hash_partner = `hash:${partner_id}:${message_id}:${user_ID}:${partner_name}:${media_group_id}\n`;
    await process_save_media_to_obj(message, user_ID, hash_id, hash_partner);
    return;
  }

  // Process manager messages part
  if (is_group) {
    logger.info(`Received message from ${type} with ID: ${id}`);

    if ((is_managers_work_chat || is_include_groups) && is_manager) {

      if (reply_to_message && is_bot && is_title) {
        const { agent_message_id, chat_id } = parse_text(text_to_parse);
        isProcessMessageRunning = true;
        await process_message({
          text: message.text || message.caption || "",
          message_id,
          id,
          photo,
          video,
          voice,
          document,
          media_group_id,
          message,
          chat_id,
          reply_to_message_id: agent_message_id,
        });
        isProcessMessageRunning = false
      }
    }
  }

  // Process save media and create calculation orders
  if (forward_from && forward_from.is_bot && is_media || is_manager && save) {
    await process_save({
      message_id,
      id,
      message,
      exist_folder: save ? true : false,
      hash_folder_id,
      is_bot: forward_from?.is_bot ? true : false,
      is_include_groups,
      partner_url
    });
    return;
  }

  // Create pre-orders
  if (is_manager && calc) {
    await process_calc({
      message,
      partner_id,
      partner_name,
      message_id,
      hash,
      hash_folder_id,
      id,
      is_include_groups,
      partner_url
    });
  }
});

// Handle errors
bot.on("polling_error", (error) => {
  logger.error(error);
});

/**
 * Asynchronously executes a task based on the send_media_obj object.
 * If the send_media_obj object contains keys, it calls the send_media_group function.
 * Otherwise, it logs a message indicating there are no media_group_files to send.
 * Sets a timeout to trigger the executeTask function again after a specified interval.
 */
async function executeTask() {
  await waitForProcessMessage();
  const media_obj = await process_return_json(send_media_obj_path);
  if (Object.keys(media_obj).length > 0) {
    await send_media_group();
  }
  setTimeout(executeTask, interval);
}

/**
 * Asynchronous function to wait for the completion of processMessage().
 * @returns {Promise} A Promise that resolves when processMessage() has finished.
 */
async function waitForProcessMessage() {
  return new Promise(resolve => {
    /**
     * Recursive function to check if processMessage() is running.
     * Resolves the Promise when processMessage() is not running.
     */
    const checkProcessMessage = () => {
      if (isProcessMessageRunning) {
        setTimeout(checkProcessMessage, 500);  // Check the status every 100 milliseconds
      } else {
        resolve();
      }
    };

    checkProcessMessage();
  });
}

/**
 * SCHEDULER FUNCTIONS FOR UPDATE JSON FILES
 */
executeTask(); // Call every 10 cseconds
setInterval(deletePropertiesFromFile, 60 * 60 * 1000); // Call every hour

