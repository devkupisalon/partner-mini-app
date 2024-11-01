const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const partner = urlParams.get('partner');
const percent_input = document.getElementById('partner-percent');
const percent_text = document.getElementById('percent-text');
const work_type_input = document.getElementById("field_select-type");
const options = work_type_input.getElementsByTagName("option");
const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');
const partner_type = options[2].value;

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

tg.onEvent('backButtonClicked', (event) => {
    window.location.href = '/';
    tg.MainButton.hide();
});

const fields = {
    percent: '#partner-percent',
    work_type : '#field_select-type'
};

/** Get settings for partner */
async function get_settings() {

    try {
        const response = await fetch(`/getsettings?partner=${partner}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const res = await response.text();

        const { data } = JSON.parse(res);
        if (data) {
            const { work_type, percent } = JSON.parse(localStorage.getItem(partner)) || data;
            console.log({ work_type, percent });

            if (work_type !== undefined) {
                    console.log('test');
                for (let option of options) {
                    if (option.value === work_type) {
                        option.selected = true;
                        break;
                    }
                }

            }

            if (percent !== undefined) {
                console.log('test');
                percent_input.value = percent;
                show(true);
            }
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

/** 
 * Get values from form 
 * return {object} object with input data
 */
function getValues() {

    const data = Object.fromEntries(
        Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
    );

    return data;
}

/** PRELOADER */
async function preload() {
    tg.MainButton.hide();
    await get_settings();
    await show_percent();
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
    tg.MainButton.setParams({ has_shine_effect: true, text: 'Сохранить настройки' });
}

preload();

/** MAIN BUTTON */
tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { percent, work_type } = getValues();
    const check1 = percent && work_type;
    const check2 = work_type;
    if (check1 || check2) {

        try {
            const response = await fetch(`/savesettings?partner=${partner}&percent=${encodeURIComponent(percent)}&work_type=${encodeURIComponent(work_type)}`);
            const { success } = await response.json();
            localStorage.setItem(partner, JSON.stringify({ work_type, percent }));
            if (success) {
                tg.showPopup({ message: 'Настройки сохранены' });
                tg.MainButton.hideProgress();
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