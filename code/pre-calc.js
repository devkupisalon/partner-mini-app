const tg = window.Telegram.WebApp;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const partner = urlParams.get('partner');

tg.BackButton.show();
tg.setBottomBarColor("bottom_bar_bg_color");

const container = document.querySelector('.container');
const preloader = document.querySelector('.c-car-spinner');
const carBrandsSelect = document.getElementById("car-brands-select");
const carModelsSelect = document.getElementById("car-models-select");

const fields = {
    name: '#client-name',
    phone: '#client-phone',
    brand: '#car-brands-select',
    model: '#car-models-select',
    gosnum: '#car-number'
};

const { user: { username, id } } = tg.initDataUnsafe;

tg.onEvent('backButtonClicked', (event) => {
    console.log(partner);
    window.location.href = `/?startapp=${partner}`;
    tg.MainButton.hide();
});

function getValues() {
    const data = Object.fromEntries(
        Object.entries(fields).map(([key, selector], i) => [key, document.querySelector(selector).value])
    );
    return data;
}

/** Get cars brands and models for select options */
async function getCarBrandsAndModels() {
    function clearCarModelsOptions() {
        while (carModelsSelect.options.length > 0) {
          carModelsSelect.remove(0);
        }
      }
    let car_values;
    try {
        const response = await fetch(`/get-cars`);
        const values = await response.json();
        car_values = Object.values(values)[0];
    } catch (err) {
        console.error(err);
    }

    for (let row of car_values) {
        const brand = row[0];
        const option = document.createElement("option");
        option.text = brand;
        carBrandsSelect.add(option);
    }

    function getCarModels() {
        clearCarModelsOptions();
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

/** PRELOADER */
async function preload() {
    tg.MainButton.hide();
    await getCarBrandsAndModels();
    preloader.style.display = "none";
    container.style.display = "flex";
    tg.MainButton.show();
    tg.MainButton.setParams({
        has_shine_effect: true,
        text: 'Сформировать расчет',
    });
}

preload();

/** MAIN BUTTON */
tg.onEvent('mainButtonClicked', async (event) => {
    tg.MainButton.showProgress(true);

    const { name, phone, brand, model, gosnum } = getValues();
    if (name && phone && brand && model && gosnum) {

        try {
            const response = await fetch(`/do-calculation?partner=${partner}
                &name=${encodeURIComponent(name)}
                &phone=${encodeURIComponent(phone)}
                &brand=${encodeURIComponent(brand)}
                &model=${encodeURIComponent(model)}
                &gosnum=${encodeURIComponent(gosnum)}
                &chat_id=${id}
                &from_web_app=true`);
            const { link } = await response.json();
            if (link) {

                tg.MainButton.hideProgress();
                tg.MainButton.setParams({
                    has_shine_effect: true,
                    text: 'Открыть расчет',
                });

                tg.onEvent('mainButtonClicked', async (event) => {
                    tg.openLink(link);
                });

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