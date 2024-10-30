const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const user = urlParams.get('user');
const id = urlParams.get('id');
const fill_tg = document.querySelector('.fill-tg');
const n = document.getElementById('partner-name');
const ph = document.getElementById('partner-phone');

let partner;

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

const fields = {
    name: '#partner-name',
    phone: '#partner-phone',
    type: '#select-type',
    logo: '#partner-logo',
    your_type: '#your-type',
    ya_link: '#yandex-link'
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

async function preload() {
    await fetchData();
    if (start_param === null) {
        el_arr.forEach(el => el.style.display = 'none');
    }
    preloader.style.display = "none";
    container.style.display = "flex";
}

preload();