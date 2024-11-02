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
            Object.values(data_obj).forEach(({ chat_id, type, uid, i, col_letter }, index) => {
                try {
                    const success = send_first_messages(chat_id, type, uid);
                    if (success) {
                        logger.info('Initial messages sent successfully');
                        const range = `${DATASHEETNAME}!${col_letter}${i}`;
                        const requestBody = { values: [[true]] };
                        const { data } = update_data(DB, range, requestBody);
                        logger.info(data);
                        if (data.spreadsheetId) {
                            logger.info(`Check_server set to TRUE`);
                        }
                    }
                } catch (error) {
                    logger.error(`Error sending initial messages: ${error}`);
                }
                new Promise(resolve => setTimeout(resolve, 1000));
            });
        } else {
            logger.info('There are no users to send initial messages');
        }

    } catch (error) {
        logger.error(`An error occurred in cron schedule: ${error}`);
    }
});

task.start();