const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');
const privacy_policy_link = document.getElementById("privacy-policy");
const condition_link = document.getElementById("conditions");
privacy_policy_link ? privacy_policy_link.href = "ссылка_на_обработку" : "";
condition_link.href = "https://docs.google.com/document/d/15froq8rgY1NWQr4UatepF7qryptLViudE7S58tfAj-Q/edit?usp=sharing";

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