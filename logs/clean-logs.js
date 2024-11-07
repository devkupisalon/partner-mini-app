import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { __dirname } from '../constants.js';
import logger from './logger.js';

const logFilePath = path.join(__dirname, 'app.log');

const clean_log_task = cron.schedule('0 0 * * 0', async () => {

    logger.info(`clean_log_task started`);

    try {

        fs.readFile(logFilePath, 'utf8', (err, data) => {
            if (err) {
                logger.error(`Error while reading file app.log: ${err.message}`);
                return;
            }

            const logs = data.split('\n').filter(line => {
                if (line.trim() === '') {
                    return false;
                }

                const log = JSON.parse(line);

                return new Date(log.time) > sevenDaysAgo;
            });

            const updatedLogs = logs.join('\n');

            fs.writeFile(path, updatedLogs, 'utf8', (err) => {
                if (err) {
                    logger.error(`Error while updating  file app.log: ${err.message}`);
                    return;
                }

                logger.info('Old logs older than 7 days have been removed');
            });
        });
    } catch (error) {
        logger.error(`Error in clean_log_task: ${error.message}`);
    }
});

clean_log_task.start();
