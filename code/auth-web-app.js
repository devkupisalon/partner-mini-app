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

fill_tg.addEventListener('click', async () => {
  await tg.requestContact(async (shared, callback) => {
    if (shared && callback) {
      const check = await fetchCheck(callback.response);
      console.log(callback);
      if (check) {
        const contact = callback.responseUnsafe.contact;
        n.value = `${contact.first_name} ${contact.last_name}`;
        ph.value = contact.phone_number;
        setCheckmark(fill_tg);
      } else {
        console.error('Data is not valid');
      }
    }
  });
});

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
    console.error('Error fetching data:', error.message); // Вывод текста ошибки в консоль
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await fetchData();
});

function formatPhoneNumber(input) {

  if (!input.value.startsWith('+') && input.value.match(/^\d/)) {
    input.value = '+' + input.value;
  }
  if (input.value === '+') {
    input.value = '';
  }
  input.value = input.value.replace(/[^+d (\d)-]/, '');
  if (input.value.startsWith('+')) {
    input.value = input.value.substring(0, 4) + input.value.substring(4).replace(/[^0-9]/g, '').slice(0, 13);
  } else {
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 10);
  }
}

function validateName(input) {
  let value = input.value;
  let pattern = /^[A-Za-zА-ЯЁа-яё]+([- ][A-Za-zА-ЯЁа-яё]+)*$/;
  if (!value.match(pattern)) {
    input.setCustomValidity("Имя должно содержать только буквы и может включать пробелы или дефисы.");
  }

  value = value.replaceAll(/\d+/g, '');
  input.value = value;
  input.setCustomValidity("");
}

let multiselect_block = document.querySelectorAll(".multiselect_block");
multiselect_block.forEach(parent => {
  let label = parent.querySelector(".field_multiselect");
  let select = parent.querySelector(".field_select");
  let text = label.innerHTML;
  select.addEventListener("change", function (element) {
    let selectedOptions = this.selectedOptions;
    label.innerHTML = "";
    for (let option of selectedOptions) {
      let button = document.createElement("button");
      button.type = "button";
      button.className = "btn_multiselect";
      button.textContent = option.value;
      button.onclick = _ => {
        option.selected = false;
        button.remove();
        if (!select.selectedOptions.length) label.innerHTML = text
      };
      label.append(button);
    }
  });
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
  tg.MainButton.setParams({ has_shine_effect: true, text: 'Зарегистироваться', });

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