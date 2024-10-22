import logger from '../logs/logger.js';

/**
 * Возвращает номер столбца, содержащего указанное значение, на указанном листе.
 * @param {Sheet} sheet - Лист, на котором производится поиск.
 * @param {string} value - Значение, которое нужно найти.
 * @returns {number} - Номер столбца, где найдено значение. Если значение не найдено, возвращается -1.
 */
function getColumnNumberByValue(values, value) {
    // const row = values.find(row => row.includes(value));
    logger.info(values);
    logger.info(value);
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

export { numberToColumn, getColumnNumberByValue }