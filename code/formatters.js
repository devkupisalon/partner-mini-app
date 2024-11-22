$(document).ready(function () {
    $('input[type="tel"]').inputmask({ "mask": "7 (999) 999 99-99" });
});

/**
 * Функция validateName для валидации введенного имени.
 * @param {HTMLInputElement} input - HTML элемент для ввода имени.
 */
function validateName(input) {
    let value = input.value;

    value = value.replaceAll(/\d+/g, '');  // Удаляет все цифры из введенного значения имени
    input.value = value;  // Устанавливает введенное значение после удаления цифр
}