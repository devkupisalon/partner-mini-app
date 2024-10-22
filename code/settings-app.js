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
tg.MainButton.show();
tg.MainButton.setParams({ has_shine_effect: true, text: 'Сохранить настройки' });

const fields = {
    percent: '#percent'
};

function show() {
    percent_input.display = 'flex';
    percent_text.display = 'flex';
}

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
                show();
            }
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

get_settings();

function getValues() {

    const { percent } = Object.fromEntries(
        Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
    );

    const work_type = work_type_input.value;

    return { work_type, percent };
}

function show_percent() {
    const selected_work_type = work_type_input.value;


    if (selected_work_type === partner_type) {
        show();
    }
}

work_type_input.onchange = show_percent;


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