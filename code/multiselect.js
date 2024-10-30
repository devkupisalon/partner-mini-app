document.addEventListener("click", function (event) {
    multiselects.forEach(multiselect => {
        let select = multiselect.querySelector(".field_select");
        let label = multiselect.querySelector(".field_multiselect");

        // Проверяем, содержит ли событие элемент выпадающего списка или его метки 
        if (!select.contains(event.target) && !label.contains(event.target)) {
            // Если событие не происходит внутри списка или его метки, скрываем список
            select.style.display = "none";
        }
    });
});

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

let multiselect = document.querySelector(".multiselect_block");
let label = multiselect.querySelector(".field_multiselect");
let select = multiselect.querySelector(".field_select");
let text = label.innerHTML;

label.addEventListener("click", () => {
    select.style.display = select.style.display === "block" ? "none" : "block";

    if (select.style.display === "block") {
        select.focus();
    }
});

select.addEventListener("change", () => {
    let selectedOptions = select.selectedOptions;
    label.innerHTML = "";
    for (let option of selectedOptions) {
        do_buttons(option, label, select, text);
    }
});

// Добавляем обработчик событий для кнопок внутри мультиселекта, чтобы предотвратить открытие опций
multiselect.querySelectorAll(".btn_multiselect").forEach(button => {
    button.addEventListener("click", event => {
        event.stopPropagation(); // Останавливаем распространение события
    });
});


async function select_all() {
    let options = select.options;
    label.innerHTML = "";

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        option.selected = true;

        do_buttons(option, label, select, text);
    }
}