import express from "express";
import path from "path";
import multer from "multer";

import logger from "./logs/logger.js";
import { check_subscription_and_authorization } from "./functions/check.js";

import {
  save,
  get_values,
  get_settings,
  save_settings,
  get_cars,
  do_calc,
  save_new_partner,
  check_moderation,
  getData,
} from "./functions/sheets.js";

import { save_logo } from "./functions/drive.js";

import { verifyTelegramWebAppData } from "./functions/validate.js";
import { constants, __dirname } from "./constants.js";

import "./functions/bot/process-bot.js";
import "./functions/process-check-moderation.js";
import "./logs/clean-logs.js";

const { BOT_TOKEN, HOME, AUTH, SETTINGS, PRE_CALC, REGISTR, PRICE } = constants;
const app = express();
const upload = multer();

app.use(express.json());

/** PATHS */
const stylesPath = path.join(__dirname, "styles");
const codePath = path.join(__dirname, "code");

/** WEB-APP ROUTES */
const routes = [
  { path: "/styles/:path", file: stylesPath, req: true },
  { path: "/scripts/:path", file: codePath, req: true },
  { path: "/", file: HOME },
  { path: "/auth", file: AUTH },
  { path: "/settings", file: SETTINGS },
  { path: "/pre-calc", file: PRE_CALC },
  { path: "/registration", file: REGISTR },
  { path: "/get-price", file: PRICE }
];

/** API ROUTES */
const apiRoutes = [
  { path: "/validate-init", handler: verifyTelegramWebAppData },
  { path: "/check", handler: check_subscription_and_authorization },
  { path: "/do-calculation", handler: do_calc },
  { path: "/get-cars", handler: get_cars },
  { path: "/save-data", handler: save },
  { path: "/save-new-partner", handler: save_new_partner },
  { path: "/upload-logo", method: "post", upload: "file", handler: save_logo },
  { path: "/save-settings", handler: save_settings },
  { path: "/get-settings", handler: get_settings },
  { path: "/get-data", handler: get_values },
  { path: "/check-registration-moderation", handler: check_moderation },
];

/** LOG MESSAGES */
const loggerMessages = [
  {
    name: verifyTelegramWebAppData.name,
    text: `An error occurred in ${verifyTelegramWebAppData.name}:`,
  },
  {
    name: check_subscription_and_authorization.name,
    text: `An error occurred in ${check_subscription_and_authorization.name}:`,
  },
  { name: do_calc.anme, text: `An error occurred in ${do_calc.name}:` },
  { name: get_cars.name, text: `An error occurred in ${get_cars.name}:` },
  { name: save.name, text: `An error occurred in ${save.name}:` },
  {
    name: save_new_partner.name,
    text: `An error occurred in ${save_new_partner.name}:`,
  },
  { name: save_logo.name, text: `An error occurred in ${save_logo.name}:` },
  {
    name: save_settings.name,
    text: `An error occurred in ${save_settings.name}:`,
  },
  {
    name: get_settings.name,
    text: `An error occurred in ${get_settings.name}:`,
  },
  { name: get_values.name, text: `An error occurred in ${get_values.name}:` },
  {
    name: check_moderation.name,
    text: `An error occurred in ${check_moderation.name}:`,
  },
];

/** PROCESS WEB-APP */
routes.forEach((route) => {
  app.get(route.path, (req, res) =>
    res.sendFile(
      route.req ? path.join(route.file, req.params.path) : route.file
    )
  );
});

/** validation */
app.get("/validate-init", async (req, res) => {
  try {
    const decodedData = req.url.replace("/validate-init?", "");
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

/** check subscription and authorization */
app.get("/check", async (req, res) => {
  try {
    const { is_subscribed, is_authorized } =
      await check_subscription_and_authorization(req.query);
    return res.json({ is_subscribed, is_authorized });
  } catch (error) {
    logger.error(`An error occurred in check: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** create pre-orders */
app.get("/do-calculation", async (req, res) => {
  try {
    const { link } = await do_calc(req.query);
    return res.json({ link });
  } catch (error) {
    logger.error(`An error occurred in do_calc: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** get cars data from cars database */
app.get("/get-cars", async (rea, res) => {
  try {
    const data = await get_cars();

    return res.json({ data });
  } catch (error) {
    logger.error(`An error occurred in get_cars: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** save user data to spreadsheet */
app.get("/save-data", async (req, res) => {
  try {
    const values_list = Object.values(req.query);
    logger.info(`Data successfully received from mini-app: ${values_list}`);
    const success = await save(req.query);

    return res.json({ success });
  } catch (error) {
    logger.error(`An error occurred in save_data: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** save new partner data */
app.get("/save-new-partner", async (req, res) => {
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

/** upload logo to partner folder in gdrive */
app.post("/upload-logo", upload.single("file"), async (req, res) => {
  try {
    const { body, file } = req;
    logger.info(
      `Data successfully received from mini app: ${JSON.stringify(body)}`
    );
    const { success } = await save_logo({ body, file });
    return res.json(success);
  } catch (error) {
    logger.error(`An error occurred in save_logo: ${error.stack}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** save partner settings to spreadsheet */
app.get("/save-settings", async (req, res) => {
  try {
    const values_list = Object.values(req.query);
    logger.info(`Data successfully received from mini-app: ${values_list}`);
    const success = await save_settings(req.query);

    return res.json({ success });
  } catch (error) {
    logger.error(`An error occurred in save_settings: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** get partners settings from spreadsheet */
app.get("/get-settings", async (req, res) => {
  try {
    const data = await get_settings(req.query.partner);

    return res.json({ data });
  } catch (error) {
    logger.error(`An error occurred in save_data: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** get groups */
app.get("/get-data", async (req, res) => {
  try {
    const values = await get_values();
    return res.json(values);
  } catch (error) {
    logger.error(`An error occurred in get_data: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** check moderation */
app.get("/check-registration-moderation", async (req, res) => {
  try {
    const success = await check_moderation(req.query);
    return res.json({ success });
  } catch (error) {
    logger.error(`An error occurred in check_modaration: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

app.get("/get-price", async (req, res) => {
  try {
    const data = await getData(req.query);
    logger.info(data);
    return res.json({ data });
  } catch (error) {
    logger.error(`An error occurred in get_price: ${error.message}`);
    return res.status(500).json({ error: error.toString() });
  }
});

/** route errors */
app.use((error, req, res, next) => {
  logger.error(`An error occurred: ${error.message}`);
  res.status(500).send(error);
});

/** init server */
app.listen("8000", (err) => {
  if (err) {
    logger.error(err.message);
  }
  logger.info("Server is running on port 8000");
});
