const tg = window.Telegram.WebApp;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get('user');
const id = urlParams.get('id');
const super_root = urlParams.get('super_root');

const fill_tg = document.querySelector('.fill-tg');
const fill_text = document.getElementById('fill-text');
const n = document.getElementById('partner-name');
const nn = document.getElementById('partner-name-label');
const ph = document.getElementById('partner-phone');
const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');
const logo = document.getElementById('partner-logo');
const upload = document.getElementById('image-upload');
const percent_input = document.getElementById('partner-percent');
const percent_text = document.getElementById('percent-text');
const work_type_input = document.getElementById("select-type");
const options = work_type_input.getElementsByTagName("option");
const partner_type = options[2].value;
const checkmark = "  &#9989";

let partner;
let obj_data = {};

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

if (super_root === "true") {
    fill_tg.style.display = "none";
    fill_text.style.display = "none";
    n.style.display = "none";
    nn.style.display = "none";
}

const fields = {
    name: '#partner-name',
    phone: '#partner-phone',
    type: '#select-type',
    your_type: '#your-type',
    ya_link: '#yandex-link',
    org_name: '#org-name',
    address: '#address',
    percent: '#partner-percent'
};

tg.onEvent('backButtonClicked', (event) => {
    let href;
    if (partner === undefined && super_root !== 'true') {
        href = '/';
    } else {
        href = `/?startapp=${partner}`;
    }
    window.location.href = href;
    tg.MainButton.hide();
});

/** 
 * Get values from form 
 * return {object} object with input data
 */
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

/** UPLOAD LOGO BUTTON */
logo.addEventListener('click', function () {
    upload.click();
});

upload.addEventListener('change', function () {
    const selectedFile = this.files[0];
    const formData = new FormData();
    formData.append('file', selectedFile);
    obj_data = formData;
    logo.innerHTML = logo.innerText + checkmark;
});

if (id && username || super_root === "true") {
    tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });

    /** MAIN BUTTON */
    tg.onEvent('mainButtonClicked', async (event) => {
        tg.MainButton.showProgress(true);

        const { buttonValues, data: { name, phone, type, your_type, ya_link, org_name, address, percent } } = getValues();

        if (buttonValues && name && phone && type && org_name && address || buttonValues && super_root === "true" && phone && type && org_name && address) {

            const timestamp = new Date().getTime();

            try {

                const queryParams = new URLSearchParams({
                    org_name: org_name,
                    phone: phone,
                    type: type,
                    your_type: your_type,
                    address: address,
                    link: ya_link,
                    categories: buttonValues,
                    percent: percent,
                    user_id: id
                });

                const reigistr_response = await fetch(`/save-new-partner?${queryParams.toString()}`);
                const { partner_id, folder } = await reigistr_response.json();

                partner = partner_id;

                if (partner_id && folder && obj_data && type === 'Партнер') {
                    obj_data.append('name', `${org_name}_logo`);
                    obj_data.append('folder', folder);

                    obj_data.forEach(m => console.log(m));

                    const logo_response = await fetch('/upload-logo', {
                        method: 'POST',
                        body: obj_data
                    });

                    const success = await logo_response.json();
                    if (success) {
                        console.log(`Logo for partner ${org_name} saved successfully`);
                    }
                }

                if (partner_id && super_root !== "true") {
                    const queryParams = new URLSearchParams({
                        timestamp: timestamp,
                        partner: partner,
                        user_id: id,
                        username: username,
                        name: name,
                        phone: phone,
                        groups: buttonValues,
                        root: true
                    });

                    const response = await fetch(`/save-data?${queryParams.toString()}`);
                    const { success } = await response.json();
                    if (success) {
                        window.location.href = `/?startapp=${partner_id}`;
                        tg.MainButton.hideProgress();
                        tg.MainButton.hide();
                    }
                } else {
                    tg.showPopup({ message: 'Новый Партнер успешно создан, не забудьте запросить у него telegram id!' });
                    window.location.reload();
                }
            } catch (error) {
                tg.showPopup({ title: 'Error', message: error });
                tg.MainButton.hideProgress();
                tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });
            }
        } else {
            tg.showPopup({ message: 'Вначале заполните все данные' });
            tg.MainButton.hideProgress();
        }
    });
}

/** PRELOADER */
async function preload() {
    tg.MainButton.hide();
    await fetchData();
    await select_all();
    await show_percent();
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
}

preload();