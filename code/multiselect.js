/**
 * Инициализация переменных для элементов мультиселекта.
 */
let multiselect = document.querySelector(".multiselect_block");
let label = multiselect.querySelector(".field_multiselect");
let select = multiselect.querySelector(".field_select");
let text = label.innerHTML;

/**
 * Обработчик события клика вне выпадающего списка для скрытия списка.
 */
document.addEventListener("click", function (event) {
    // Проверяем, содержит ли событие элемент выпадающего списка или его метки 
    if (!select.contains(event.target) && !label.contains(event.target)) {
        // Если событие не происходит внутри списка или его метки, скрываем список
        select.style.display = "none";
    }
});

/**
 * Функция создания кнопок для выбранных опций мультиселекта.
 * @param {HTMLOptionElement} option - Выбранная опция.
 * @param {HTMLElement} label - Элемент для отображения выбранных значений.
 * @param {HTMLSelectElement} select - Элемент мультиселекта.
 * @param {string} text - Текст для отображения в мультиселекте.
 */
function do_buttons(option, label, select, text) {
    let button = document.createElement("button");
    button.type = "button";
    button.className = "btn_multiselect";
    button.textContent = option.value;

    button.onclick = event => {
        event.stopPropagation(); // Останавливаем распространение события
        option.selected = false;
        button.remove();
        if (!select.selectedOptions.length) label.innerHTML = text;
    };
    label.append(button);
}

/**
 * Обработчик события клика по метке для отображения или скрытия выпадающего списка.
 */
label.addEventListener("click", () => {
    select.style.display = select.style.display === "block" ? "none" : "block";

    if (select.style.display === "block") {
        select.focus();
    }
});

/**
 * Обработчик изменения выбранных опций в мультиселекте для отображения кнопок выбора.
 */
select.addEventListener("change", () => {
    let selectedOptions = select.selectedOptions;
    label.innerHTML = "";
    for (let option of selectedOptions) {
        do_buttons(option, label, select, text);
    }
});

// Добавляем обработчик событий для кнопок в мультиселекте для предотвращения открытия опций.
multiselect.querySelectorAll(".btn_multiselect").forEach(button => {
    button.addEventListener("click", event => {
        event.stopPropagation(); // Останавливаем распространение события
    });
});

/**
 * Асинхронная функция select_all для выбора всех опций в мультиселекте.
 */
async function select_all() {
    let options = select.options;
    label.innerHTML = "";

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        option.selected = true;

        do_buttons(option, label, select, text);
    }
}