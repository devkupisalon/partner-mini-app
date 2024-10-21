const tg = window.Telegram.WebApp;
const channel = 'https://t.me/kupi_salon';

tg.ready();

const subscribe = document.getElementById("subscribe-button");
const auth = document.getElementById("auth-button");
const calculate = document.getElementById("calculate-button");
const auth_text = document.getElementById("auth-text");
const subscribe_text = document.getElementById("subscribe-text");
const auth_block = document.querySelector(".auth-block")

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
            s.innerHTML = s.innerText + "  &#9989";
            setCheckmark(s);
        });
    },
    a: () => {
        auth_text.style.opacity = "0.5";
        [auth, calculate].forEach(s => {
            setCheckmark(s);
        });
        auth.innerHTML = auth.innerText + "  &#9989"
    },
    s: () => {
        subscribe_text.style.opacity = "0.5";
        [subscribe, calculate].forEach(s => {
           setCheckmark(s);
        });
        subscribe.innerHTML = subscribe.innerText + "  &#9989"
    }
};

const checkSubscriptionAndAuthorization = async () => {
    try {
        const response = await fetch(`/check?partner=${start_param}&user_id=${id}`);
        const { is_subscribed, is_authorized } = await response.json();

        console.log({ is_subscribed, is_authorized });

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

window.addEventListener('DOMContentLoaded', async () => {
    await fetchData();
    await checkSubscriptionAndAuthorization();
});

subscribe.addEventListener('click', function () {
    tg.openTelegramLink(channel);
});

auth.addEventListener('click', function () {
    window.location.href = `/auth?partner=${start_param}&user=${username}&id=${id}`;
});

calculate.addEventListener('click', function () {

});