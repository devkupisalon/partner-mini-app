import gauth from '../functions/google_auth.js';
import logger from '../logs/logger.js';

import { constants, __dirname } from '../constants.js';
import { numberToColumn, getColumnNumberByValue } from '../functions/helper.js';

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
    WEBAPPURL } = constants;

/**
 * Получить данные из указанного диапазона в таблице Google Sheets
 * @param {string} spreadsheetId - Идентификатор таблицы Google Sheets
 * @param {string} range - Диапазон данных для извлечения
 * @returns {Array} - Массив значений из таблицы
 */
const get_data = async (spreadsheetId, range) => {
    const { data: { values } } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return values;
}

/**
 * Update data in a specific range of a Google Spreadsheet.
 * @param {string} spreadsheetId - The ID of the spreadsheet.
 * @param {string} range - The range in the spreadsheet to update.
 * @param {Object} requestBody - The request body containing the data to update.
 * @returns {Object} - The updated data.
 */
const update_data = async (spreadsheetId, range, requestBody) => {
    const { data } = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody,
    });
    return { data };
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
        let { timestamp, partner, user_id, username, name, phone, partner_NAME, root } = params;

        if (partner_NAME === undefined) {
            const { partner_name } = await get_partner_name_and_manager(partner);
            partner_NAME = partner_name;
        }

        const arr = [timestamp, partner, partner_NAME, user_id, username, name, phone, root || ''];
        const requestBody = { values: [arr] };
        const range = `${SHEETNAME}!A${values.length + 1}`;

        const { data } = await update_data(SPREADSHEETID, range, requestBody);

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

        const { data } = await update_data(DB, range, requestBody);

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

        const { data } = await update_data(MONITORSPREADSHEET, range, requestBody);

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
        const arr = [uid, org_name, , , , link, address, , , phone, categories || your_type, folderLink, , , , , type, percent || '', , , user_id];
        const values = await get_data(DB, DATASHEETNAME);
        const row = values.findIndex(r => r[0] === '') + 1;
        const range = `${DATASHEETNAME}!A${row}`;
        const requestBody = { values: [arr] };

        const { data } = await update_data(DB, range, requestBody);

        if (data.spreadsheetId) {
            logger.info('New partner data saved successfully');
            return { partner_id: uid, folder: id };
        }
    } catch (error) {
        logger.error(`Error in save_new_partner: ${error.message}`);
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

/**
 * Asynchronous function to check moderation status for a specific user.
 * @param {string} user_id - The ID of the user to check moderation for.
 */
const check_moderation = async (user_id) => {
    try {
        const values = await get_data(DB, DATASHEETNAME);
        const { check_col, root_id_col } = ['check', 'root_id'].reduce((acc, k) => {
            acc[`${k}_col`] = getColumnNumberByValue(values[0], k) - 1;
            return acc;
        }, {});

        const success_values = values.find(r => r[root_id_col] === user_id);
        const success = success_values?.map(r => [r[0], r[1], r[check_col]]);

        if (success) {
            logger.info(`Moderation for partner ${success[1]} with id ${success[0]} and user_id ${user_id} is completed`);
            return true;
        } else if (success && success[2] === 'FALSE') {
            logger.warn(`Moderation for root_user_id ${user_id} is not completed`);
            return 'moderation';
        } else if (!success_values) {
            logger.info(`User with id ${user_id} not found in data base`);
            return false;
        }
    } catch (error) {
        logger.error(`Error in check_moderation: ${error.stack}`);
    }
}

const check_success_moderation = async () => {
    try {
        const values = await get_data(DB, DATASHEETNAME);

        const { check_col, root_id_col, server_check_col, work_type_col } = ['check', 'server_check', 'root_id', 'work_type']
            .reduce((acc, k) => {
                acc[`${k}_col`] = getColumnNumberByValue(values[0], k) - 1;
                return acc;
            }, {});

        const col_letter = numberToColumn(server_check_col + 1);

        const data_obj = values.slice(1).reduce((acc, r, i) => {
            const { 0: uid,
                [check_col]: check,
                [root_id_col]: root_id,
                [server_check_col]: check_server,
                [work_type_col]: type } = r;

            logger.info(check);

            if (check && !check_server && root_id) {
                acc[uid] = { chat_id: root_id, type, uid, i: i + 2, col_letter };
            }
            return acc;
        }, {});

        logger.info(data_obj);

        if (Object.keys(data_obj).length > 0) {
            return data_obj;
        } else {
            return {};
        }

    } catch (error) {
        logger.error(`Error in check_success_moderation: ${error.stack}`);
    }
}

export {
    update_data,
    get_values,
    save,
    auth,
    save_settings,
    get_settings,
    get_cars,
    do_calc,
    save_new_partner,
    save_logo,
    get_partners_data,
    check_moderation,
    check_success_moderation
};