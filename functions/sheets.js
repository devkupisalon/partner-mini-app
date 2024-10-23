import gauth from '../functions/google_auth.js';
import { constants } from '../constants.js';
import logger from '../logs/logger.js';
import { numberToColumn, getColumnNumberByValue } from '../functions/helper.js'

const sheets = gauth();
const { SPREADSHEETID, SHEETNAME, DB, GROUPSSHEETNAME, DATASHEETNAME, VALUE, CARSSHEETNAME, CARSSPREADSHEET } = constants;

const get_values = async () => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: DB,
            range: GROUPSSHEETNAME,
        });

        logger.info('Data recieved successfully');
        return values;
    } catch (error) {
        logger.error(error.message);
    }
}

const save = async (arr) => {

    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEETID,
            range: SHEETNAME,
        });

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
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEETID,
            range: SHEETNAME,
        });

        const success = values
            .slice(1)
            .filter(f => f[1] === partner && f[2] === user_id && f.slice(3, 7)
                .every(Boolean)) != '';

        logger.info(success);

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
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: DB,
            range: DATASHEETNAME
        });

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
        logger.error(error.stack);
        return false;
    }

}

const get_settings = async (partner) => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: DB,
            range: DATASHEETNAME
        });
        const column_index = getColumnNumberByValue(values[0], VALUE) - 1;
        const data = values.find(r => r[0] === partner);

        if (data !== '') {
            const percent = data[column_index + 1];
            const work_type = data[column_index];
            if (work_type || work_type && percent) {
                logger.info(`Settings for partner with id: ${partner} finded`);
                logger.info({ work_type, percent });
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
    const {} = params;
}

const get_cars = async () => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: CARSSPREADSHEET,
            range: CARSSHEETNAME,
        });

        logger.info('Data recieved successfully');
        return values;
    } catch (error) {
        logger.error(error.message);
    }
}

export { get_values, save, auth, save_settings, get_settings, get_cars, do_calc };