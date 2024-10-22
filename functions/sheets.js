import gauth from '../functions/google_auth.js';
import { constants } from '../constants.js';
import logger from '../logs/logger.js';
import { numberToColumn, getColumnNumberByValue } from '../functions/helper.js'

const sheets = gauth();
const { SPREADSHEETID, SHEETNAME, DB, GROUPSSHEETNAME, DATASHEETNAME, VALUE } = constants;

const get_values = async () => {
    try {
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: DB,
            range: GROUPSSHEETNAME, // Замените на нужный диапазон ячеек
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
            range: SHEETNAME, // Замените на нужный диапазон ячеек
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
            range: SHEETNAME, // Замените на нужный диапазон ячеек
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
        const { partner, user_id, work_type, percent } = obj;
        const { data: { values } } = await sheets.spreadsheets.values.get({
            spreadsheetId: DB,
            range: DATASHEETNAME, // Замените на нужный диапазон ячеек
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
            requestBody,
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
            range: DATASHEETNAME, // Замените на нужный диапазон ячеек
        });
        const column_index = getColumnNumberByValue(values[0], VALUE) - 1;
        
        logger.info(column_index);
        const data = values.find(r => r[0] === partner).map(r => [r[column_index], r[column_index + 1]]).flat();
        if (data !== '') {
            logger.info(`Settings for partner with id: ${partner} finded`);
            logger.info(data);
            return data;
        }
    } catch (error) {
        logger.error(error.stack);
        return false;
    }
}

export { get_values, save, auth, save_settings, get_settings };