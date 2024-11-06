import { promises as fs } from 'fs';
import logger from '../logs/logger.js';
import { constants } from '../constants.js';

const { media_files_obj_path } = constants;

/**
 * Asynchronous function to read and parse JSON data from a file and assign it to a global object.
 * @param {string} path - The path to the JSON file.
 * @param {Object} global_obj - Global object to assign the parsed data.
 */
const process_read_json = async (path, global_obj) => {
    await fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
            logger.error(`Error in reda_json_file: ${err}`);
            return;
        }
        const jsonData = JSON.parse(data);
        global_obj = jsonData;
    });
}

/**
 * Function to write JSON data from an object to a file.
 * @param {string} path - The path to the JSON file.
 * @param {Object} global_obj - The object to be converted to JSON and written to the file.
 */
const process_write_json = async (path, global_obj) => {
    const data = JSON.stringify(global_obj, null, 2); // Convert object to JSON string

    await fs.writeFile(path, data, 'utf8', (err) => {
        if (err) {
            logger.error(`Error in write_json_file: ${err}`);
            return;
        }
        logger.info(`Data successfully written to file: ${path}`);
    });
};

/**
 * Asynchronous function to read and parse JSON data from a file.
 * @param {string} path - The path to the JSON file.
 * @returns {Promise<object>} Promise that resolves to the parsed JSON data.
 */
const process_return_json = async (path) => {
    try {
        const data = await fs.readFile(path, 'utf8');
        const jsonData = JSON.parse(data);
        return jsonData;
    } catch (err) {
        logger.error(`Error in read_json_file: ${err}`);
        throw err;
    }
};

/**
 * Function to delete 7 days old properties from a JSON file.
 */
const deletePropertiesFromFile = async () => {
    try {

        const now = new Date();
        // Read the file
        const data = await fs.readFile(media_files_obj_path, 'utf8');
        const jsonData = JSON.parse(data);

        for (const chatId in jsonData) {
            const expirationDate = new Date(jsonData[chatId].expiration_date);
            const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
            if (now - expirationDate >= weekInMilliseconds) {
                logger.info(`Delete media_data after 7 days from chat_id: ${chatId}`);
                delete jsonData[chatId];
            }
        }

        // Convert the object back to a JSON string
        const newData = JSON.stringify(jsonData, null, 2);

        // Write the updated data back to the file
        await fs.writeFile(filePath, newData, 'utf8');

        logger.info('Specified properties successfully removed from JSON file.');
    } catch (err) {
        logger.error(`Error while deleting properties from JSON file: ${err}`);
    }
};

/**
* Function to add a new property to a JSON file.
* @param {string} filePath - The path to the JSON file.
* @param {Object} newProperty - The new property to add to the JSON object.
*/
const append_json_file = async (filePath, newProperty) => {
    try {
        const data = await fs.readFile(filePath, 'utf8')

        // Parse the data from the file
        const jsonData = JSON.parse(data);

        // Add the new property to the object
        Object.assign(jsonData, newProperty);

        // Convert the object back to a JSON string
        const newData = JSON.stringify(jsonData, null, 2);

        // Write the updated data back to the file
        await fs.writeFile(filePath, newData, 'utf8');

        logger.info('New property successfully added to JSON file.');
    } catch (err) {
        logger.error(`Error while adding a new property to JSON file: ${err}`);
    }
}

export {
    deletePropertiesFromFile,
    append_json_file,
    process_read_json,
    process_return_json,
    process_write_json
}