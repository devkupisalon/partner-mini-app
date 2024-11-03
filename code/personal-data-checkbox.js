const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');

// Слушаем изменения состояния чекбокса
checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
        tg.MainButton.enable();
        label_personal_data.style.color = 'initial';
    } else {
        tg.MainButton.disable();
        label_personal_data.style.color = 'red';
    }
});