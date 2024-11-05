const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');

/** CHECKBOX CHANGE */
checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
        tg.MainButton.show();
        label_personal_data.style.color = tg.themeParams.hint_color;
    } else {
        tg.MainButton.hide();
        label_personal_data.style.color = 'red';
    }
});