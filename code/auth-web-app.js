const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const username = urlParams.get('user');
const id = urlParams.get('id');
const partner = urlParams.get('partner');

const fields = {
  manager_name: '#manager-name',
  phone: '#manager-phone',
  email: '#manager-email',
};

const setCheckmark = s => {
  s.style.pointerEvents = "none";
  s.style.opacity = "0.5";
};

const fill_tg = document.querySelector('.fill-tg');
const n = document.getElementById('manager-name');
const ph = document.getElementById('manager-phone');
const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

tg.onEvent('backButtonClicked', (event) => {
  window.location.href = '/';
  tg.MainButton.hide();
});

function getValues() {

  const data = Object.fromEntries(
    Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
  );

  const buttons = document.querySelectorAll('.btn_multiselect');
  let buttonValues = [];

  buttons.forEach(button => {
    const buttonValue = button.textContent.trim();
    buttonValues.push(buttonValue);
  });

  buttonValues = buttonValues.join(', ');
  return { buttonValues, data };
}

if (id && username) {
  tg.MainButton.show();
  tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });

  tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { buttonValues, data: { manager_name, phone, email } } = getValues();

    if (buttonValues && manager_name && phone && email) {

      const timestamp = new Date().getTime();

      try {
        const response = await fetch(`/savedata?timestamp=${timestamp}&partner=${partner}&user_id=${id}&username=${username}&name=${manager_name}&phone=${phone}&email=${email}&groups=${buttonValues}`);

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
  await fetchData();
  preloader.style.display = "none";
  container.style.display = "flex";
}

preload();