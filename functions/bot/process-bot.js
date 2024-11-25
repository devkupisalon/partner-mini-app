import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants, managers_map } from "../../constants.js";
import { get_partners_data, get_all_groups_ids } from "../google/sheets.js";
import { parse_text, get_hash, return_conditions, get_fast_partner_data } from "../helper.js";
import { process_save_media_to_obj, send_media_group } from "./process-media-group.js";
import { process_message } from "./process-message.js";
import { process_calc, process_save } from "./process-google.js";
import { deletePropertiesFromFile, process_return_json } from "../process-json.js";

const interval = 10000;

let { GROUP_CHAT_ID, MINI_APP_LINK } = constants;
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
    reply_markup
  } = message;

  const group_title = !DEV_MODE ? `Купи салон Рабочая` : 'PARTNER_SERVICE';
  const from_id = message.from.id;
  const group_ids_obj = await get_all_groups_ids();

  const {
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
  } = return_conditions({
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
    reply_markup
  });

  logger.info(reply_to_message.entities);

  const text_to_parse = is_text_to_parse
    ? (reply_to_message.entities
      ? reply_to_message.entities[1].url
      : reply_to_message.caption_entities[1].url).toString().replace(MINI_APP_LINK, '')
    : '';

  const hash_folder_id = is_hash_folder_id ? is_hash_folder_id[1] : '';
  const hash = get_hash(message, is_manager, is_include_groups);

  let text = message.text || message.caption || "";

  let user_ID =
    reply_to_message && is_manager && is_group
      ? reply_to_message?.from.id
      : is_group
        ? from_id
        : id;

  if (contact) return;

  // let partner_name, partner_id, row, partner_folder;

  // Get partners/agents data from sheet
  const { partner_name, partner_id, row, partner_folder } = await get_fast_partner_data({ user_ID, message, calc, is_include_groups, is_manager });
  // if (!is_manager || (is_manager && is_include_groups)) {
  //   const p = await get_partners_data(user_ID);
  //   partner_id = p.partner_id;
  //   partner_name = p.partner_name;
  //   row = p.row;
  //   partner_folder = p.partner_folder;
  // } else if (message.entities && calc) {
  //   const { chat_id } = parse_text(decodeURI(message.entities[0].url.toString().replace(MINI_APP_LINK, '')));
  //   const x = await get_partners_data(chat_id);
  //   partner_id = x.partner_id;
  //   partner_name = x.partner_name;
  //   row = x.row;
  //   partner_folder = x.partner_folder;
  // }

  const partner_url = `${DBLINK}&range=${row}:${row}`;
  logger.info({ partner_name, partner_url });

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
      partner_url,
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
          from_user: false,
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
      partner_url,
      forward_from_id: forward_from?.id
    });
  }
});

// Handle errors
bot.on("polling_error", (error) => {
  logger.error(error.stack);
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

