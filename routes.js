import express from 'express';
import path from 'path';
import { unescape } from 'querystring';

import logger from './logs/logger.js';
import { subscription } from './functions/check.js';
import { save, get_values, auth } from './functions/sheets.js';
import { verifyTelegramWebAppData } from './functions/validate.js';
import { constants, __dirname } from './constants.js';

const { BOT_TOKEN, HOME, AUTH } = constants;
const app = express();

const stylesPath = path.join(__dirname, 'styles');
const codePath = path.join(__dirname, 'code');

app.get("/validate-init", async (req, res) => {
    try {
        const decodedData = Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, unescape(value)]));
        logger.debug(decodedData);
        const hash = verifyTelegramWebAppData(decodedData, BOT_TOKEN);

        if (hash) {
            logger.info(`Validation successful: ${decodedData}`);
            return res.json(decodedData);
        } else {
            logger.warn(`Validation failed: ${decodedData}`);
            return res.status(401).json({});
        }
    } catch (error) {
        logger.error(`An error occurred: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/', (req, res) => res.sendFile(HOME));

app.get('/styles/:path', (req, res) => res.sendFile(path.join(stylesPath, req.params.path)));

app.get('/scripts/:path', (req, res) => res.sendFile(path.join(codePath, req.params.path)));

app.use((error, req, res, next) => {
    logger.error(`An error occurred: ${error.message}`);
    res.status(500).send(error);
});

app.get('/auth', (req, res) => res.sendFile(AUTH));

app.get('/check', async (req, res) => {
    try {
        const { user_id, partner } = req.query;

        const is_authorized = await auth(user_id, partner);
        const is_subscribed = await subscription();

        return res.json({ is_subscribed, is_authorized });
    } catch (error) {
        logger.error(`An error occurred in check: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/savedata', async (req, res) => {
    try {
        const values_list = Object.values(req.query);
        logger.info(`Data successfully received from mini-app: ${values_list}`);
        const success = await save(values_list);

        return res.json({ success });
    } catch (error) {
        logger.error(`An error occurred in save_data: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/getdata', async (req, res) => {
    try {
        const values = await get_values();

        return res.json(values);
    } catch (error) {
        logger.error(`An error occurred in get_data: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.listen('8000', (err) => {
    if (err) {
        logger.error(err.message);
    }
    logger.info('Server is running on port 8000');
});