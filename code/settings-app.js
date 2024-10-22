const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const partner = urlParams.get('partner');

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");
tg.MainButton.show();
tg.MainButton.setParams({ has_shine_effect: true, text: 'Сохранить настройки' });

const fields = {
    percent: '#percent'
};

// const work_type = document.getElementById('partner-work-type');
const percent_input = document.getElementById('partner-percent')
const work_type_input = document.getElementById("field_select-type");


async function get_settings() {

    try {
        const response = await fetch(`/getsettings?partner=${partner}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const res = await response.text();

        const { data } = JSON.parse(res);
        const flatValues = data.flat();
        const data_obj = flatValues.map(([work_type, percent]) => ({ work_type, percent }));
        const { work_type, percent } = JSON.parse(localStorage.getItem(partner)) || data_obj;
        const options = work_type_input.getElementsByTagName("option");

        for (let option of options) {
            if (option.value === work_type) {
                option.selected = true;
                break; 
            }
        }

        percent_input.value = percent;

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

get_settings();

// let multiselect_block = document.querySelectorAll(".multiselect_block");
// multiselect_block.forEach(parent => {
//     let label = parent.querySelector(".field_multiselect");
//     let select = parent.querySelector(".field_select");
//     let text = label.innerHTML;
//     select.addEventListener("change", function (element) {
//         let selectedOptions = this.selectedOptions;
//         label.innerHTML = "";
//         for (let option of selectedOptions) {
//             let button = document.createElement("button");
//             button.type = "button";
//             button.className = "btn_multiselect";
//             button.textContent = option.value;
//             button.onclick = _ => {
//                 option.selected = false;
//                 button.remove();
//                 if (!select.selectedOptions.length) label.innerHTML = text
//             };
//             label.append(button);
//         }
//     });
// });

function getValues() {

    const { percent } = Object.fromEntries(
        Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
    );

    // const button = document.querySelector('.btn_multiselect');
    const work_type = work_type_input.value;

    return { work_type, percent };
}

tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { percent, work_type } = getValues();
    const check1 = percent && work_type;
    const check2 = work_type;
    if (check1 || check2) {

        try {
            const response = await fetch(`/savesettings?partner=${partner}&user_id=${id}&percent=${percent}&work_type=${work_type}`);
            const { success } = await response.json();
            localStorage.setItem(partner, JSON.stringify({ work_type, percent }));
            if (success) {
                tg.showPopup({ message: 'Настройки сохранены' });
                tg.MainButton.hideProgress();
                tg.MainButton.hide();
            }
        } catch (error) {
            tg.showPopup({ title: 'Error', message: error });
            tg.MainButton.hideProgress();
        }
    } else {
        tg.showPopup({ message: 'Вначале заполните все данные' });
        tg.MainButton.hideProgress();
    }
});