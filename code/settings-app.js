const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const partner = urlParams.get('partner');
const percent_input = document.getElementById('partner-percent');
const percent_text = document.getElementById('percent-text');
const work_type_input = document.getElementById("field_select-type");
const options = work_type_input.getElementsByTagName("option");
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

/** inputmask for precentage */
function mask() {
    const elm = document.getElementById('partner-percent');
    const suffix = '%';
    const bypass = [9, 16, 17, 18, 36, 37, 38, 39, 40, 91, 92, 93];

    const saveValue = (data) => {
        elm.dataset.value = data;
    };

    const pureValue = () => {
        let value = elm.value.replace(/\D/g, '');
        value = parseInt(value.replace(suffix, ''))
        return value || '';
    };

    const focusNumber = () => {
        elm.setSelectionRange(elm.dataset.value.length, elm.dataset.value.length);
    };

    elm.addEventListener('keyup', (e) => {
        if (bypass.indexOf(e.keyCode) !== -1) return;

        const pure = pureValue();
        saveValue(pure);

        if (!pure) {
            elm.value = '';
            return;
        }

        elm.value = pure + suffix;
        focusNumber();
    });
}

mask();

/** Show  or hide percent input form */
function show(check) {
    let d = check ? 'flex' : 'none';
    percent_input.style.display = d;
    percent_text.style.display = d;
    if (!check) { percent_input.value = '' }
}

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

                for (let option of options) {
                    if (option.value === work_type) {
                        option.selected = true;
                        break;
                    }
                }

            }

            if (percent !== undefined) {
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

/** Show or hide percent onChange work type input */
async function show_percent() {
    const selected_work_type = work_type_input.value;

    if (selected_work_type === partner_type) {
        show(true);
    } else {
        show(false);
    }

    work_type_input.onchange = show_percent;
}

/** PRELOADER */
async function preload() {
    tg.MainButton.hide();
    const container = document.querySelector('.container');
    await get_settings();
    await show_percent();
    const preloader = document.querySelector('.c-car-spinner');
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