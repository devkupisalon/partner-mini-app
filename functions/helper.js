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
 * Prepares and extracts phone number, name, brand, model, and license plate number from the provided text.
 * @param {string} text - The text containing phone number, name, brand, model, and license plate number.
 * @returns {Object} - An object containing extracted phone number, name, brand, model, and license plate number.
 */
const prepare_calc = (text, partner = false) => {
    const parts = text.split(/\n+/);
    const [name, phone, brand, model, gosnum] = !partner ? parts.slice(1) : parts;
    return { phone, name, brand, model, gosnum }
}

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
 * Returns an array of text values from the provided messages_map object.
 * @param {object} messages_map - The messages map object containing text values.
 * @returns {array} - An array of text values extracted from the messages map.
 */
const get_first_messages = (messages_map) => {
    // Initialize an empty array to store text values
    const textArray = [];

    // Iterate through all keys in the messages_map object
    for (const key in messages_map) {
        // Check if the key property exists in the object
        if (messages_map.hasOwnProperty(key)) {
            // Get the object by key
            const obj = messages_map[key];

            // Iterate through all keys in the internal obj object
            for (const userRole in obj) {
                // Check if the text property exists and add its value to the textArray
                if (obj[userRole].text) {
                    textArray.push(obj[userRole].text);
                }
            }
        }
    }
    return textArray;
}

export { numberToColumn, getColumnNumberByValue, HQD_photo, parse_text, prepare_calc }