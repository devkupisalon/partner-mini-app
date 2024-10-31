import express from 'express';
import path from 'path';

import logger from './logs/logger.js';
import { subscription } from './functions/check.js';

import {
    save, get_values,
    auth,
    get_settings,
    save_settings,
    get_cars,
    do_calc,
    save_new_partner,
    save_logo
} from './functions/sheets.js';

import { verifyTelegramWebAppData } from './functions/validate.js';
import { constants, __dirname } from './constants.js';

const { BOT_TOKEN, HOME, AUTH, SETTINGS, PRE_CALC, REGISTR } = constants;
const app = express();

const stylesPath = path.join(__dirname, 'styles');
const codePath = path.join(__dirname, 'code');

app.get('/styles/:path', (req, res) => res.sendFile(path.join(stylesPath, req.params.path)));
app.get('/scripts/:path', (req, res) => res.sendFile(path.join(codePath, req.params.path)));

app.get('/', (req, res) => res.sendFile(HOME));
app.get('/auth', (req, res) => res.sendFile(AUTH));
app.get('/settings', (req, res) => res.sendFile(SETTINGS));
app.get('/pre-calc', (req, res) => res.sendFile(PRE_CALC));
app.get('/registration', (req, res) => res.sendFile(REGISTR));

app.use((error, req, res, next) => {
    logger.error(`An error occurred: ${error.message}`);
    res.status(500).send(error);
});

app.get("/validate-init", async (req, res) => {
    try {
        const decodedData = req.url.replace('/validate-init?', '');
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

app.get('/check', async (req, res) => {
    try {
        const { user_id, partner } = req.query;

        const is_authorized = await auth(user_id, partner);
        const is_subscribed = await subscription(user_id);

        return res.json({ is_subscribed, is_authorized });
    } catch (error) {
        logger.error(`An error occurred in check: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/do-calculation', async (req, res) => {
    try {
        const link = await do_calc(req.query);
        return res.json({ link });
    } catch (error) {
        logger.error(`An error occurred in do_calc: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/get-cars', async (rea, res) => {
    try {
        const data = await get_cars();

        return res.json({ data });
    } catch (error) {
        logger.error(`An error occurred in get_cars: ${error.message}`);
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

app.get('/save-new-partner', async (req, res) => {
    try {
        const values_list = Object.values(req.query);
        logger.info(`Data successfully received from mini-app: ${values_list}`);
        const data = await save_new_partner(req.query);

        return res.json(data);
    } catch (error) {
        logger.error(`An error occurred in save_new_partner: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.post('/uplopad-logo', express.json(), async (req, res) => {
    logger.info(`Data successfully received from mini app: ${JSON.stringify(req.body)}`);
    await save_logo(req.body);
});

app.get('/savesettings', async (req, res) => {
    try {
        const values_list = Object.values(req.query);
        logger.info(`Data successfully received from mini-app: ${values_list}`);
        const success = await save_settings(req.query);

        return res.json({ success });
    } catch (error) {
        logger.error(`An error occurred in save_data: ${error.message}`);
        return res.status(500).json({ error: error.toString() });
    }
});

app.get('/getsettings', async (req, res) => {
    try {
        const data = await get_settings(req.query.partner);

        return res.json({ data });
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