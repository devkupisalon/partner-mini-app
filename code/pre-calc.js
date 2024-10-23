const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const partner = urlParams.get('partner');
const fio = document.getElementById('client-name');

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

const fields = {
    name: '#сlient-name',
    phone: '#client-phone',
    brand: '#car-brands-select',
    model: '#car-models-select',
    gosnum: '#car-number'
};

tg.onEvent('backButtonClicked', (event) => {
    window.location.href = '/';
    tg.MainButton.hide();
  });

function applyFIOFilter(elem) {
    elem.addEventListener('keypress', function (e) {
        var val = elem.value + e.key;

        if (val.split(" ").length == 4) e.preventDefault();

    });
}

applyFIOFilter(fio);

function getValues() {

    const data = Object.fromEntries(
        Object.entries(fields).map(([key, selector]) => [key, document.querySelector(selector).value])
    );

    return data;
}

async function getCarBrandsAndModels() {
    let car_values;
    try {
        const response = await fetch(`/get-cars`);
        const values = await response.json();
        car_values = Object.values(values);
        // Обработка полученных данных
        console.log(car_values);
    } catch (err) {
        // Обработка ошибок
        console.error(err);
    }

    const carBrandsSelect = document.getElementById("car-brands-select");
    const carModelsSelect = document.getElementById("car-models-select");

    for (let row of car_values) {
        const brand = row[0]; // Марка авто
        const option = document.createElement("option");
        option.text = brand;
        carBrandsSelect.add(option);
    }

    function getCarModels() {
        const selectedBrand = carBrandsSelect.value;

        for (let [brand, ...models] of car_values) {
            if (brand === selectedBrand) {
                for (let model of models) {
                    const option = document.createElement("option");
                    option.text = model;
                    carModelsSelect.add(option);
                }
            }
        }

        if (carModelsSelect.options.length > 0) {
            carModelsSelect.disabled = false;
        }
    }

    carBrandsSelect.onchange = getCarModels;
}

async function preload() {
    tg.MainButton.hide();
    const container = document.querySelector('.container');
    container.style.display = "none";
    await getCarBrandsAndModels();
    const preloader = document.querySelector('.c-car-spinner');
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
    tg.MainButton.setParams({
        has_shine_effect: true,
        text: 'Сформировать расчет',
    });
}

preload();


tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { name, phone, brand, model, gosnum } = getValues();
    if (name && phone && brand && model && gosnum) {

        try {
            const response = await fetch(`/do-calculation?partner=${partner}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&brand=${encodeURIComponent(brand)}&=model${encodeURIComponent(model)}&=gosnum${encodeURIComponent(gosnum)}`);
            const { success } = await response.json();
            if (success) {
                tg.showPopup({ message: 'Расчет сформирован' });
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