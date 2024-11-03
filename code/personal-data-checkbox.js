const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');

// Слушаем изменения состояния чекбокса
checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
        tg.MainButton.enabled();
        label_personal_data.style.color = 'initial';
    } else {
        tg.MainButton.disabled();
        label_personal_data.style.color = 'red';
    }
});