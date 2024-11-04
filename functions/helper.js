import logger from '../logs/logger.js';

/**
 * Возвращает номер столбца, содержащего указанное значение, на указанном листе.
 * @param {Sheet} sheet - Лист, на котором производится поиск.
 * @param {string} value - Значение, которое нужно найти.
 * @returns {number} - Номер столбца, где найдено значение. Если значение не найдено, возвращается -1.
 */
function getColumnNumberByValue(values, value) {
    // const row = values.find(row => row.includes(value));

    if (values) {
        const columnNumber = values.indexOf(value) + 1;
        return columnNumber;
    } else {
        return -1; // Если значение не найдено, возвращаем -1
    }
}

/**
* Преобразует число в соответствующую строку столбца в таблице Google Sheets.
* @param {number} n - Число для преобразования.
* @return {string} - Строка с соответствующим значением столбца.
*/
function numberToColumn(n) {
    /* Google Sheets использует A = 1, мы вычисляем, начиная с 0 */
    if (n <= 0) n = 1;

    n -= 1;

    let ordA = "A".charCodeAt(0);
    let ordZ = "Z".charCodeAt(0);
    let len = ordZ - ordA + 1;

    let s = "";
    while (n >= 0) {
        s = String.fromCharCode((n % len) + ordA) + s;
        n = Math.floor(n / len) - 1;
    }
    return s;
}

// Get file_id with high quality
const HQD_photo = (photo) => photo.reduce((prev, current) =>
    (prev.file_size > current.file_size) ? prev : current
);

/**
 * Parses the reply text to extract message ID, agent name, agent ID, and chat ID.
 * 
 * @param {string} replyText The text from the reply message.
 * @returns {object} An object containing the extracted information: agent ID, message ID, agent name, chat ID.
 */
const parse_text = (replyText) => {
    const hash = replyText.match(/hash:(.*)/)[1];
    const [agent_id, agent_message_id, chat_id, agent_name, hash_id] = hash.split(':');
    return { agent_id, agent_message_id, agent_name, chat_id, hash_id };
}

/**
 * Function to check and delete data if a week has passed
 */
function checkAndDeleteOldData(media_files) {
    const now = new Date();
    for (const chatId in media_files) {
        const expirationDate = new Date(media_files[chatId].expiration_date);
        const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        if (now - expirationDate >= weekInMilliseconds) {
            logger.info(`Delete media_data after 7 days from chat_id: ${chatId}`);
            delete media_files[chatId];
        }
    }
}

export { numberToColumn, getColumnNumberByValue, HQD_photo, parse_text, checkAndDeleteOldData }