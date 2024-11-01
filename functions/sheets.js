import gauth from '../functions/google_auth.js';
import logger from '../logs/logger.js';

import { constants, __dirname } from '../constants.js';
import { numberToColumn, getColumnNumberByValue } from '../functions/helper.js';
import { pinned_message, send_first_message } from './process-bot.js';

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Readable } from 'stream';


const { sheets, drive } = gauth();
const { SPREADSHEETID,
    SHEETNAME,
    DB,
    GROUPSSHEETNAME,
    DATASHEETNAME,
    VALUE,
    CARSSHEETNAME,
    CARSSPREADSHEET,
    MONITORSPREADSHEET,
    MONITORSHEETNAME,
    PARTNERSPARENT,
    WEBAPPURL,
    MINI_APP_LINK } = constants;

/**
 * Получить данные из указанного диапазона в таблице Google Sheets
 * @param {string} spreadsheetId - Идентификатор таблицы Google Sheets
 * @param {string} range - Диапазон данных для извлечения
 * @returns {Array} - Массив значений из таблицы
 */
const get_data = async (spreadsheetId, range) => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return values;
    } catch (error) {
        logger.error(error.message);
    }
}

/**
 * Получить значения из указанного документа Google Sheets
 * @returns {Array} - Массив значений из указанной таблицы
 */
const get_values = async () => {
    try {
        const values = await get_data(DB, GROUPSSHEETNAME);

        logger.info('Data received successfully');
        return values;
    } catch (error) {
        logger.error(`Error in get_values: ${error.message}`);
    }
}

/**
 * Сохранить данные в указанную таблицу Google Sheets
 * @param {Object} params Объект с данными
 * @returns {boolean} - Успешно ли сохранены данные
 */
const save = async (params) => {
    try {

        const values = await get_data(SPREADSHEETID, SHEETNAME);
        let { timestamp, partner, user_id, username, name, phone, groups, partner_NAME, root } = params;

        if (partner_NAME === undefined) {
            const { partner_name } = await get_partner_name_and_manager(partner);
            partner_NAME = partner_name;
        }

        const arr = [timestamp, partner, partner_NAME, user_id, username, name, phone, groups, root || ''];
        const requestBody = { values: [arr] };
        const range = `${SHEETNAME}!A${values.length + 1}`;

        const { data } = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEETID,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody,
        });

        if (data.spreadsheetId) {
            logger.info('User data saved successfully');
            return true;
        }
    } catch (error) {
        logger.error(`Error in save: ${error.stack}`);
        return false;
    }
}

/**
 * Авторизация пользователя по ID и партнеру в таблице Google Sheets
 * @param {string} user_id - ID пользователя для авторизации
 * @param {string} partner - Партнер пользователя
 * @returns {boolean} - Успешно ли пользователь авторизован
 */
const auth = async (user_id, partner) => {
    try {
        const values = await get_data(SPREADSHEETID, SHEETNAME);

        const success = values
            .slice(1)
            .filter(f => f[1] === partner && f[3] === user_id && f.slice(4, 7).every(Boolean)) != '';

        const root = values
            .slice(1)
            .filter(f => f[1] === partner && f[3] === user_id && f[7]) != '';

        if (success) {
            logger.info(`User with id: ${user_id} is authorized`);
            if (root) {
                logger.info(`User with id: ${user_id} have root premissions`);
            }
            return { success, root };
        } else {
            return { success: false, root: false };
        }
    } catch (error) {
        logger.error(`Error in auth: ${error.message}`);
    }
}

/**
 * Сохранить настройки в таблице Google Sheets
 * @param {object} obj - Объект с настройками для сохранения
 * @returns {boolean} - Успешно ли сохранены настройки
 */
const save_settings = async (obj) => {
    let range;

    try {
        let { partner, work_type, percent } = obj;
        const values = await get_data(DB, DATASHEETNAME);

        const arr = [work_type, percent || ''];
        const requestBody = { values: [arr] };

        const column_index = getColumnNumberByValue(values[0], VALUE);
        const column_letter = numberToColumn(column_index);
        const index = values.findIndex(v => v[0] === partner);

        if (index !== -1) {
            range = `${DATASHEETNAME}!${column_letter}${index + 1}`;
        } else {
            logger.warn(`Partner with id: ${partner} not found in database`);
            return false;
        }

        const { data } = await sheets.spreadsheets.values.update({
            spreadsheetId: DB,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody
        });

        if (data.spreadsheetId) {
            logger.info('Settings data saved successfully');
            return true;
        }
    } catch (error) {
        logger.error(`Error in save_settings: ${error.message}`);
        return false;
    }
}

/**
 * Получить настройки для указанного партнера
 * @param {string} partner - Идентификатор партнера, для которого нужно получить настройки
 * @returns {object|boolean} - Объект с настройками (work_type, percent) или false, если настройки не найдены
 */
const get_settings = async (partner) => {
    try {
        if (partner !== 'null') {
            const values = await get_data(DB, DATASHEETNAME);
            const column_index = getColumnNumberByValue(values[0], VALUE) - 1;
            const data = values.find(r => r[0] === partner);

            if (data !== '') {
                const percent = data.length >= column_index + 1 ? data[column_index + 1] : undefined;
                const work_type = data[column_index];
                if (work_type || (work_type && percent)) {
                    logger.info(`Settings for partner with id: ${partner} found`);
                    return { work_type, percent };
                } else {
                    logger.warn(`Settings for partner with id: ${partner} not found`);
                    return false;
                }
            }
        } else {
            logger.warn(`First init partner`);
            return false;
        }
    } catch (error) {
        logger.error(`Error in get_settings: ${error.stack}`);
        return false;
    }
}

/**
 * Выполнить расчет и сохранить данные в мониторинг Google Sheets
 * @param {object} params - Параметры для расчета и сохранения
 * @returns {string|boolean} - Ссылка на результат или false в случае ошибки
 */
const do_calc = async (params) => {
    const date = format(new Date(), 'dd.MM.yyyy');
    const uid = uuidv4();
    const { partner, name, phone, brand, model, gosnum } = params;
    const { partner_name, manager, work_type, percent, calculate_id, partner_folder } = await get_partner_name_and_manager(partner);
    const arr = [uid, , , , , , manager, brand, model, gosnum, , , , , , , name, phone, 'Партнер', partner_name, , , , , , , , , , , , , , , , , date];

    try {
        const values = await get_data(MONITORSPREADSHEET, MONITORSHEETNAME);
        const requestBody = { values: [arr] };
        const row = values.length + 1;
        const range = `${MONITORSHEETNAME}!A${row}`;

        const { data } = await sheets.spreadsheets.values.update({
            spreadsheetId: MONITORSPREADSHEET,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody
        });

        if (data.spreadsheetId) {
            logger.info('Data for calculation saved successfully');
        }

        const linkResponse = await fetch(WEBAPPURL, {
            method: 'POST',
            body: JSON.stringify({
                row,
                work_type,
                percent,
                calculate_id,
                partner_folder,
                partner
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (linkResponse.ok) {
            const link = await linkResponse.text();
            logger.info(`Received link: ${link}`);
            return link;
        } else {
            logger.warn('Error getting the link:', linkResponse.status, linkResponse.statusText);
        }
    } catch (error) {
        logger.error(`Error in do_calc: ${error.message}`);
        return false;
    }
}

/**
 * Получить наименование партнера, менеджера и другие данные по идентификатору партнера
 * @param {string} partner_id - Идентификатор партнера для получения данных
 * @returns {object|boolean} - Объект с данными партнера (partner_name, manager, work_type, percent, calculate_id, partner_folder) или false в случае ошибки
 */
const get_partner_name_and_manager = async (partner_id) => {
    try {
        const values = await get_data(DB, DATASHEETNAME);
        const data = values.find(r => r[0] === partner_id);
        let [, partner_name, , , , , , , , , , partner_folder, , , , , work_type, percent, manager, calculate_id] = data;
        partner_folder = partner_folder.split('/').pop();
        return { partner_name, manager, work_type, percent, calculate_id, partner_folder };
    } catch (error) {
        logger.error(`Error in get_partner_name_and_manager: ${error.message}`);
        return false;
    }
}

/**
 * Получить данные о машинах из Google Sheets
 * @returns {Array} - Массив данных о машинах
 */
const get_cars = async () => {
    try {
        const values = await get_data(CARSSPREADSHEET, CARSSHEETNAME);
        logger.info('Data received successfully');
        return values;
    } catch (error) {
        logger.error(`Error in get_cars: ${error.message}`);
    }
}

/**
 * Создать новую папку в Google Drive
 * @param {string} name - Имя новой папки
 * @returns {object} - Объект с ссылкой на папку и её ID, если успешно создана, иначе логируется ошибка
 */
const create_folder = async (name) => {
    try {
        const response = await drive.files.create({
            resource: {
                name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [PARTNERSPARENT]
            }
        });

        const { data: { id } } = response;
        const folderLink = `https://drive.google.com/drive/folders/${id}`;

        // Добавление разрешения для другого пользователя как owner
        await drive.permissions.create({
            fileId: id,
            requestBody: {
                role: 'writer', // Роль доступа
                type: 'domain', // Тип доступа
                domain: 'kupisalon.ru' // Домен для разрешения
            }
        });

        logger.info('Folder created successfully');
        return { folderLink, id };
    } catch (error) {
        logger.error(`Error in create_folder: ${error.stack}`);
    }
}

/**
 * Сохранить данные о новом партнере
 * @param {object} params - Параметры нового партнера (org_name, address, phone, type, your_type, link, categories)
 * @returns {object} - Объект с идентификатором партнера и ссылкой на созданную папку, если данные сохранены успешно
 */
const save_new_partner = async (params) => {
    const uid = uuidv4();
    const { org_name, address, phone, type, your_type, link, categories, percent, user_id } = params;
    const { folderLink, id } = await create_folder(org_name);

    try {
        const arr = [uid, org_name, , , , link, address, , , phone, categories || your_type, folderLink, , , , , type, percent || ''];
        const values = await get_data(DB, DATASHEETNAME);
        const row = values.length + 1;
        const range = `${DATASHEETNAME}!A${row}`;
        const requestBody = { values: [arr] };

        const { data } = await sheets.spreadsheets.values.update({
            spreadsheetId: DB,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody
        });

        if (data.spreadsheetId) {
            logger.info('New partner data saved successfully');
            if (type === 'Агент') {
                await process_agent(user_id, uid);
            }
        }
        return { partner_id: uid, folder: id };
    } catch (error) {
        logger.error(`Error in save_new_partner: ${error.message}`);
    }
}

const process_agent = async (chat_id, uid) => {
    try {
        const message_text = `Кнопка для формирования расчета 👇`;
        const url = `${MINI_APP_LINK}${uid}-calc-true`;
        await send_first_message(chat_id);
        await pinned_message(chat_id, message_text, url);
    } catch (error) {
        logger.error(`An a error occured in process_agent: ${error.message}`);
    }
}

/**
 * Сохранить логотип партнера в его папку на Google Drive
 * @param {object} params - Параметры для сохранения логотипа (name, folder, file)
 * @returns {object} - Объект успешности загрузки, если логотип успешно загружен
 */
const save_logo = async (params) => {
    try {
        const { body: { name, folder }, file } = params;
        const mimeType = 'image/png';

        const fileMetadata = {
            name,
            parents: [folder],
            mimeType
        };

        const fileStream = new Readable();
        fileStream.push(file.buffer);
        fileStream.push(null);

        const { data: { id } } = await drive.files.create({
            requestBody: fileMetadata,
            media: {
                mimeType,
                body: fileStream
            },
            fields: 'id',
        });

        if (id) {
            logger.info(`Logo successfully uploaded to partner folder`);
            return { success: 'success' };
        }
    } catch (error) {
        logger.error(`Error in save_logo: ${error.message}`);
    }
}

/**
 * Получение данных о партнере по идентификатору чата
 * @param {string} chat_id - Идентификатор чата пользователя
 * @returns {Promise<{ partner_name: string, partner_id: string }>} - Объект с данными партнера (имя и ID)
 */
const get_partners_data = async (chat_id) => {

    try {
        const values = await get_data(SPREADSHEETID, SHEETNAME);
        const { partner_name, partner_id } = values
            .slice(1)
            .reduce((acc, [, partner_id, partner_name, id]) => {
                if (id === String(chat_id)) {
                    acc.partner_name = partner_name;
                    acc.partner_id = partner_id;
                }
                return acc;
            }, {});

        if (partner_name && partner_id) {
            logger.info(`User with id: ${chat_id} is authorized`);
            return { partner_name, partner_id };
        } else {
            logger.warn(`User with id: ${chat_id} is not authorized`);
            return { partner_name: undefined, partner_id: undefined };
        }
    } catch (error) {
        logger.error(`Error in get_partners_data: ${error.message}`);
    }
}

export {
    get_values,
    save,
    auth,
    save_settings,
    get_settings,
    get_cars,
    do_calc,
    save_new_partner,
    save_logo,
    get_partners_data
};