const tg = window.Telegram.WebApp;
const channel = 'https://t.me/kupi_salon';

tg.ready();

const subscribe = document.getElementById("subscribe-button");
const auth = document.getElementById("auth-button");
const calculate = document.getElementById("calculate-button");
const auth_text = document.getElementById("auth-text");
const subscribe_text = document.getElementById("subscribe-text");
const auth_block = document.querySelector(".auth-block")
const settings = document.getElementById("s-button");
const checkmark = "  &#9989";

tg.enableClosingConfirmation();

const { user: { username, id }, start_param } = tg.initDataUnsafe;

const setCheckmark = s => {
    s.style.pointerEvents = "none";
    s.style.opacity = "0.5";
};

const checkout = {
    as: () => {
        [auth, subscribe].forEach(s => {
            s.disabled = true;
            s.innerHTML = s.innerText + checkmark;
            setCheckmark(s);
        });
    },
    a: () => {
        auth_text.style.opacity = "0.5";
        [auth, calculate].forEach(s => {
            setCheckmark(s);
        });
        auth.innerHTML = auth.innerText + checkmark
    },
    s: () => {
        subscribe_text.style.opacity = "0.5";
        [subscribe, calculate].forEach(s => {
            setCheckmark(s);
        });
        subscribe.innerHTML = subscribe.innerText + checkmark
    }
};

const check = async () => {

    let is_settings;

    try {
        const response = await fetch(`/check?partner=${start_param}&user_id=${id}`);
        const { is_subscribed, is_authorized } = await response.json();

        console.log({ is_subscribed, is_authorized, is_settings });

        const checks = {
            a: is_authorized && !is_subscribed,
            as: is_authorized && is_subscribed,
            s: (!is_authorized || is_authorized == undefined) && is_subscribed
        };

        for (const key in checks) {
            if (checks[key]) {
                if (checkout[key]) {
                    checkout[key]();
                }
                break;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

const fetchData = async () => {
    try {
        const response = await fetch(`/validate-init?${tg.initData}`);
        const data = await response.json();
    } catch (error) {
        console.error('Error:', error);
    }
};

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
            return { work_type, percent };
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

subscribe.addEventListener('click', function () {
    tg.openTelegramLink(channel);
});

auth.addEventListener('click', function () {
    window.location.href = `/auth?partner=${start_param}&user=${username}&id=${id}`;
});

settings.addEventListener('click', function () {
    window.location.href = `/settings?partner=${start_param}&user=${username}&id=${id}`
});

calculate.addEventListener('click', function () {
    const { work_type, percent } = get_settings();
    if (work_type || work_type && percent) {
        window.location.href = `/pre-calc?partner=${partner}`;
    } else {
        tg.showPopup({ message: 'Вначале заполните и сохраните настройки' });
    }
});

async function preload() {
    const container = document.querySelector('.container');
    container.style.display = "none";
    await fetchData();
    await check();
    const preloader = document.querySelector('.c-car-spinner');
    preloader.style.display = "none";
    container.style.display = "flex";
}

preload();