import gauth from '../functions/google_auth.js';
import { constants } from '../constants.js';
import logger from '../logs/logger.js';

const sheets = gauth();
const { SPREADSHEETID, SHEETNAME, DB, GROUPSSHEETNAME } = constants;

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
            spreadsheetId: DB,
            range: SHEETNAME, // Замените на нужный диапазон ячеек
        });

        const requestBody = { values: [arr] };
        const range = `${SHEETNAME}!A${values.length + 1}`;

        const { data } = await sheets.spreadsheets.values.update({
            spreadsheetId: DB,
            range,
            valueInputOption: 'RAW',
            requestBody,
        });

        if (data.spreadsheetId) {
            logger.info('User data saved successfully');
        }
    } catch (error) {
        logger.error(error.message);
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
                .every(Boolean));

        if (success) {
            logger.info("User is authorized");
            return true;
        }
    } catch (error) {
        logger.error(error.message);
    }
}

export { get_values, save, auth };