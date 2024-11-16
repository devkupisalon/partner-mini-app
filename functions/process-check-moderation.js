import logger from "../logs/logger.js";
import { send_first_messages } from "./process-bot.js";
import { check_success_moderation, update_data } from "./sheets.js";
import { constants } from "../constants.js";

import cron from "node-cron";

const { DB, DATASHEETNAME } = constants;

const task = cron.schedule("*/20 * * * * *", async () => {
  let success_send = false;
  try {
    const data_obj = await check_success_moderation();

    if (Object.keys(data_obj).length > 0) {
      for (const {
        chat_id,
        type,
        uid,
        i,
        col_letter,
        group_id,
        manager_chat_id,
        name,
      } of Object.values(data_obj)) {
        try {
          const { success, success_send_check } = await send_first_messages(
            chat_id,
            type,
            uid,
            group_id,
            manager_chat_id,
            name,
            success_send
          );
          success_send = success_send_check;
          if (success) {
            logger.info("Initial messages sent successfully");

            const range = `${DATASHEETNAME}!${col_letter}${i}`;
            const requestBody = { values: [[true]] };
            const { data } = await update_data(DB, range, requestBody);

            if (data.spreadsheetId) {
              logger.info(`check_server to uid: ${uid} set to TRUE`);
            }
          }
        } catch (error) {
          logger.error(`Error sending initial messages: ${error}`);
        }
      }
    }
  } catch (error) {
    logger.error(`An error occurred in cron schedule: ${error}`);
  }
});

task.start();
