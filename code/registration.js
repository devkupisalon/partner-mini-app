const tg = window.Telegram.WebApp;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get('user');
const id = urlParams.get('id');

const fill_tg = document.querySelector('.fill-tg');
const n = document.getElementById('partner-name');
const ph = document.getElementById('partner-phone');
const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');
const logo = document.getElementById('partner-logo');
const upload = document.getElementById('image-upload');
const checkmark = "  &#9989";

let partner;
let obj_data = {};

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

const fields = {
    name: '#partner-name',
    phone: '#partner-phone',
    type: '#select-type',
    your_type: '#your-type',
    ya_link: '#yandex-link',
    org_name: '#org-name',
    address: '#address'
};

tg.onEvent('backButtonClicked', (event) => {
    let href;
    if (partner === undefined) {
        href = '/';
    } else {
        href = `/?startapp=${partner}`;
    }
    window.location.href = href;
    tg.MainButton.hide();
});

function getValues() {

    const data = Object.fromEntries(
        Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
    );

    const buttons = document.querySelectorAll('.btn_multiselect');
    let buttonValues = [];

    buttons?.forEach(button => {
        const buttonValue = button.textContent.trim();
        buttonValues.push(buttonValue);
    });

    buttonValues = buttonValues.length > 0 ? buttonValues.join(', ') : undefined;
    return { buttonValues, data };
}

logo.addEventListener('click', function () {
    upload.click();
});

upload.addEventListener('change', function () {
    const selectedFile = this.files[0];

    const reader = new FileReader();
    reader.onload = function (event) {
        const base64String = event.target.result;

        // Сохранение base64 строки файла в объекте obj_data
        // obj_data = { file: base64String };

        logo.innerHTML = logo.innerText + checkmark;
    };

    // Чтение выбранного файла как base64
    reader.readAsDataURL(selectedFile);
});

if (id && username) {
    tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });

    tg.onEvent('mainButtonClicked', async (event) => {
        tg.MainButton.showProgress(true);

        const { buttonValues, data: { name, phone, type, your_type, ya_link, org_name, address } } = getValues();

        if (buttonValues && name && phone && type && org_name && address) {

            const timestamp = new Date().getTime();

            try {

                const reigistr_response = await fetch(`/save-new-partner?org_name=${org_name}&phone=${phone}&type=${type}&your_type=${your_type}&address=${encodeURIComponent(address)}&link=${ya_link}&categories=${buttonValues}`);
                const { partner_id, folder } = await reigistr_response.json();

                if (partner_id && folder && obj_data) {
                    obj_data.name = `${org_name}_logo`;
                    obj_data.folder = folder;

                    console.log(obj_data);

                    const logo_response = await fetch('/upload-logo', {
                        method: 'POST',
                        body: JSON.stringify(obj_data)
                    });

                    const success = await logo_response.json();
                    if (success) {
                        logger.info(`Logo for partner ${org_name} saved successfully`);
                    }
                }

                if (partner_id) {
                    const response = await fetch(`/savedata?timestamp=${timestamp}&partner=${partner}&user_id=${id}&username=${username}&name=${name}&phone=${phone}&groups=${buttonValues}`);

                    const { success } = await response.json();
                    if (success) {
                        tg.showPopup({ message: 'Регистрация прошла успешно' });
                        tg.MainButton.hideProgress();
                        tg.MainButton.hide();
                        window.location.href = '/';
                    }
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
}

async function preload() {
    tg.MainButton.hide();
    await fetchData();
    await select_all()
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
}

preload();