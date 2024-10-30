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

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

const fetchCheck = async (string) => {
  try {
    const response = await fetch(`/validate-init?${string}`);
    const data = await response.json();
    console.log(data);
    return data ? true : false;
  } catch (error) {
    console.error('Error:', error);
  }
};

tg.onEvent('backButtonClicked', (event) => {
  window.location.href = '/';
  tg.MainButton.hide();
});

async function fetchData() {

  const selectElement = document.getElementById('field_select-type');

  try {
    const response = await fetch('/getdata');
    console.log(response);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const text = await response.text();

    const data = JSON.parse(text);
    const flatValues = data.flat();

    flatValues.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.text = option;
      selectElement.appendChild(optionElement);
    });

  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchData();
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

  const { manager_name, phone, email } = data;

  buttonValues = buttonValues.join(', ');
  return { buttonValues, manager_name, phone, email };
}

if (id && username) {
  tg.MainButton.show();
  tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться' });

  tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { buttonValues, manager_name, phone, email } = getValues();
    console.log({ buttonValues, manager_name, phone, email });
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