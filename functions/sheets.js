import gauth from '../functions/google_auth.js';
import { constants } from '../constants.js';
import logger from '../logs/logger.js';
import { numberToColumn, getColumnNumberByValue } from '../functions/helper.js';

import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';


const sheets = gauth();
const { SPREADSHEETID, SHEETNAME, DB, GROUPSSHEETNAME, DATASHEETNAME, VALUE, CARSSHEETNAME, CARSSPREADSHEET, MONITORSPREADSHEET,
    MONITORSHEETNAME } = constants;

const get_data = async (spreadsheetId, range) => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        return values
    } catch (error) {
        logger.error(error.message);
    }
}

const get_values = async () => {
    try {
        const values = await get_data(DB, GROUPSSHEETNAME);

        logger.info('Data recieved successfully');
        return values;
    } catch (error) {
        logger.error(error.message);
    }
}

const save = async (arr) => {

    try {
        const values = await get_data(SPREADSHEETID, SHEETNAME);

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
        logger.error(error.stack);
        return false;
    }

}

const auth = async (user_id, partner) => {
    try {

        const values = await get_data(SPREADSHEETID, SHEETNAME);

        const success = values
            .slice(1)
            .filter(f => f[1] === partner && f[2] === user_id && f.slice(3, 7)
                .every(Boolean)) != '';

        if (success) {
            logger.info(`User with id: ${user_id} is authorized`);
            return success;
        }
    } catch (error) {
        logger.error(error.message);
    }
}

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
        logger.error(error.message);
        return false;
    }

}

const get_settings = async (partner) => {
    try {
        const values = await get_data(DB, DATASHEETNAME);
        const column_index = getColumnNumberByValue(values[0], VALUE) - 1;
        const data = values.find(r => r[0] === partner);

        if (data !== '') {
            const percent = data[column_index + 1];
            const work_type = data[column_index];
            if (work_type || work_type && percent) {
                logger.info(`Settings for partner with id: ${partner} finded`);
                return { work_type, percent };
            } else {
                logger.warn(`Settings for partner with id: ${partner} not found`);
                return false;
            }
        }
    } catch (error) {
        logger.error(error.stack);
        return false;
    }
}

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

        const linkResponse = await fetch('https://script.google.com/macros/s/AKfycbxHbbhuf_18A-n6t1Bk-2UdHJjUyM-1dq13Q_hUUZSwZ_gEtPKkaJxWFpSQpKMqbykBQA/exec', {
            method: 'POST',
            body: JSON.stringify({
                row,
                work_type,
                percent,
                calculate_id,
                partner_folder
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (linkResponse.ok) {
            const link = await linkResponse.text();
            console.log('Полученная ссылка:', link);
            return link;
        } else {
            console.error('Ошибка получения ссылки:', linkResponse.status, linkResponse.statusText);
        }
    } catch (error) {
        logger.error(error.message);
        return false;
    }
}

const get_partner_name_and_manager = async (partner_id) => {
    try {
        const values = await get_data(DB, DATASHEETNAME);
        const data = values.find(r => r[0] === partner_id);
        let [, partner_name, , , , , , , , , partner_folder, , , , , , work_type, percent, manager, calculate_id] = data;
        partner_folder = partner_folder.split('/').pop();
        return { partner_name, manager, work_type, percent, calculate_id, partner_folder };
    } catch (error) {
        logger.error(error.message);
        return false;
    }
}

const get_cars = async () => {
    try {
        const values = await get_data(CARSSPREADSHEET, CARSSHEETNAME);
        logger.info('Data recieved successfully');
        return values;
    } catch (error) {
        logger.error(error.message);
    }
}

export { get_values, save, auth, save_settings, get_settings, get_cars, do_calc };