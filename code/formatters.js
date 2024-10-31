/**
 * Функция formatPhoneNumber для форматирования введенного номера телефона.
 * @param {HTMLInputElement} input - HTML элемент для ввода номера телефона.
 */
function formatPhoneNumber(input) {
    input.value = input.value.replace(/[^\d]/g, '');  // Удаляет все нецифровые символы из введенного значения
    input.value = input.value.slice(0, 13);  // Ограничивает длину значения до 13 символов
}

/**
 * Функция validateName для валидации введенного имени.
 * @param {HTMLInputElement} input - HTML элемент для ввода имени.
 */
function validateName(input) {
    let value = input.value;

    value = value.replaceAll(/\d+/g, '');  // Удаляет все цифры из введенного значения имени
    input.value = value;  // Устанавливает введенное значение после удаления цифр
}