import logger from '../logs/logger.js';
import { send_first_messages } from './process-bot.js';
import { check_success_moderation, update_data } from './sheets.js';
import { constants } from '../constants.js';

import cron from 'node-cron';

const { DB, DATASHEETNAME } = constants;

const task = cron.schedule('* * * * *', async () => {
    try {
        const data_obj = await check_success_moderation();

        if (Object.keys(data_obj).length > 0) {
            Object.values(data_obj).forEach(async ({ chat_id, type, uid, i, col_letter }) => {
                try {
                    const success = await send_first_messages(chat_id, type, uid);
                    if (success) {
                        const range = `${DATASHEETNAME}!${col_letter}${i}`;
                        const requestBody = { values: [[true]] };
                        const { data } = await update_data(DB, range, requestBody);
                        await new Promise(resolve => setTimeout(resolve, 4000));
                        logger.info(data);
                        logger.info('Initial messages sent successfully');
                        if (data.spreadsheetId) {
                            logger.info(`Check_server set to TRUE`);
                        }
                    }
                } catch (error) {
                    logger.error(`Error sending initial messages: ${error}`);
                }
            });
        } else {
            logger.info('There are no users to send initial messages');
        }
    } catch (error) {
        logger.error(`An error occurred in cron schedule: ${error}`);
    }
});

task.start();