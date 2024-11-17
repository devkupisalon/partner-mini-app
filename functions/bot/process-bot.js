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
const { send_media_obj_path } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

/**
 * Forward messages from user chats to managers groups chat and
 * send back responses from managers to user chats
 */
bot.on("message", async (message) => {
  // logger.info(message);

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
  // const is_partner_group =
  //   group_ids_obj.hasOwnProperty(reply_to_message?.chat.id) ||
  //   group_ids_obj.hasOwnProperty(forward_from?.chat?.id); // partners group

  const hash_folder_id = message.text.match(/hash_folder:(.*)/)[1];
  const hash = message.text.match(/hash:(.*)/)[1];

  const is_include_groups = group_ids_obj.hasOwnProperty(id); // include groups in groups ids obj
  const group_title = `Купи салон Рабочая`;
  const is_title = reply_to_message?.chat.title === group_title;

  let text = message.text || message.caption || "";
  let partner_name, partner_id, row;

  let user_ID =
    reply_to_message && is_manager && is_group
      ? reply_to_message?.from.id
      : is_group
        ? from_id
        : id;

  if (contact) return;

  if (!is_manager) {
    const p = await get_partners_data(user_ID);
    partner_id = p.partner_id;
    partner_name = p.partner_name;
    row = p.row;
  }

  // process agent messages
  if (partner_name && partner_id && !is_group && !is_bot && !is_manager) {
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
  }

  // process save media to json if is media send from partner/agent in group
  if (is_group && partner_id && partner_name && media_group_id) {
    const hash_id = uuidv4();
    const hash_partner = `hash:${partner_id}:${message_id}:${user_ID}:${partner_name}:${media_group_id}\n`;
    await process_save_media_to_obj(message, user_ID, hash_id, hash_partner);
    return;
  }

  // process manager messages part
  if (is_group) {
    logger.info(`Received message from ${type} with ID: ${id}`);

    if (is_managers_work_chat || is_include_groups) {

      if (reply_to_message && is_bot && is_title) {
        const { agent_message_id, chat_id } = parse_text(text_to_parse);

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
      }
    }
  }

  // process save media and create calculation orders
  if (forward_from && forward_from.is_bot && is_manager) {
    const is_media =
      photo ||
      video ||
      voice ||
      document ||
      media_group_id;

    if (is_media) {
      await process_save({
        message_id,
        id,
        message,
      });
    }
  }

  if (is_manager && hash && hash_folder_id) {
    await process_calc({
      message,
      partner_id,
      message_id,
      hash,
      hash_folder_id
    });
  }
});

/**
 * Asynchronously executes a task based on the send_media_obj object.
 * If the send_media_obj object contains keys, it calls the send_media_group function.
 * Otherwise, it logs a message indicating there are no media_group_files to send.
 * Sets a timeout to trigger the executeTask function again after a specified interval.
 */
async function executeTask() {
  const media_obj = await process_return_json(send_media_obj_path);
  if (Object.keys(media_obj).length > 0) {
    await send_media_group();
  }
  setTimeout(executeTask, interval);
}

/**
 * SCHEDULER FUNCTIONS FOR UPDATE GLOBAL CONSTANTS
 */
executeTask(); // Call every 10 cseconds
setInterval(deletePropertiesFromFile, 60 * 60 * 1000); // Call every hour

// Handle errors
bot.on("polling_error", (error) => {
  logger.error(error);
});

