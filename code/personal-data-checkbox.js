const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');

/** CHECKBOX CHANGE */
checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
        tg.MainButton.show();
        console.log(tg.ThemeParams)
        label_personal_data.style.color = 'red';
    } else {
        tg.MainButton.hide();
        label_personal_data.style.color = 'red';
    }
});