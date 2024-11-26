const checkbox = document.getElementById('personal-data-checkbox');
const label_personal_data = document.getElementById('personal-data-id');
const privacy_policy_link = document.querySelector('a[href="ссылка_на_обработку"]');
const condition_link = document.querySelector('a[href="ссылка_на_условия"]');
const privacy_policy = "https://docs.google.com/document/d/1-97d6mWROAveReH3bovUirABGMwWdWD2xjpG3mjRa-A/edit?usp=sharing";
const condition = "https://docs.google.com/document/d/15froq8rgY1NWQr4UatepF7qryptLViudE7S58tfAj-Q/edit?usp=sharing";

condition_link ? condition_link.addEventListener('click', function (event) {
    event.preventDefault();
    tg.openLink(condition);
}) : "";

privacy_policy_link ? privacy_policy_link.addEventListener('click', function (event) {
    event.preventDefault();
    tg.openLink(privacy_policy);
}) : "";


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