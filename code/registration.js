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

document.getElementById('partner-logo').addEventListener('click', function() {
    document.getElementById('image-upload').click();
});

document.getElementById('image-upload').addEventListener('change', function() {

    // Получаем выбранное изображение
    const selectedImage = this.files[0];
    console.log(selectedImage);
    // Здесь можно обработать выбранное изображение, например, показать его предпросмотр или сохранить для последующей загрузки
});

if (id && username) {
    tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });
  
    tg.onEvent('mainButtonClicked', async (event) => {
      tg.MainButton.showProgress(true);
  
      const { buttonValues, data: { name, phone, type, logo, your_type } } = getValues();
  
      if (buttonValues && name && phone && type && logo, your_type) {
  
        const timestamp = new Date().getTime();
  
        try {
          const response = await fetch(`/savedata?timestamp=${timestamp}&partner=${partner}&user_id=${id}&username=${username}&name=${name}&phone=${phone}&email=${email}&groups=${buttonValues}`);
  
          const { success } = await response.json();
          if (success) {
            tg.showPopup({ message: 'Регистрация прошла успешно' });
            tg.MainButton.hideProgress();
            tg.MainButton.hide();
            window.location.href = '/';
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
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
}

preload();