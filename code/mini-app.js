const tg = window.Telegram.WebApp;
const channel = "https://t.me/kupi_salon";
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const partner = urlParams.get("startapp");

tg.ready();

const success_checkmark = document.querySelector(".success-checkmark");
const success_text = document.getElementById("success-message");
const subscribe = document.getElementById("subscribe-button");
const auth = document.getElementById("auth-button");
const calculate = document.getElementById("calculate-button");
const auth_text = document.getElementById("auth-text");
const settings_text = document.getElementById("settings-text");
const subscribe_text = document.getElementById("subscribe-text");
const auth_block = document.querySelector(".auth-block");
const settings = document.getElementById("s-button");
const container = document.querySelector(".container");
const preloader = document.querySelector(".c-car-spinner");
const checkmark = "  &#9989";
const el_arr = [calculate, settings, settings_text];

let work_type_partner, percent_partner, root;

tg.enableClosingConfirmation();

let {
  user: { username, id },
  start_param,
} = tg.initDataUnsafe;

const calc = start_param?.includes("-calc-true") || false;
const do_reg = start_param?.includes(`-reg-do-true`) || false;
const price = start_param?.includes("-price-true") || false;
const super_root = start_param === 'super-root' ? start_param : '';
start_param = calc
  ? String(start_param).replace("-calc-true", "")
  : do_reg
    ? String(start_param).replace("-reg-do-true", "")
    : price
      ? String(start_param).replace("-price-true", "")
      : start_param;
start_param = start_param !== undefined ? start_param : partner;

/**
 * Установить галочку для элемента и отключить его
 * @param {HTMLElement} s - Элемент, для которого нужно установить галочку и отключить
 */
const setCheckmark = (s) => {
  s.style.pointerEvents = "none";
  s.style.opacity = "0.5";
};

/**
 * Объект с методами для установки галочек и отключения кнопок
 */
const checkout = {
  no_sub: () => {
    auth.style.display = "none";
    auth_text.style.display = "none";
  },
  as: () => {
    [auth, subscribe].forEach((s) => {
      s.disabled = true;
      s.innerHTML = s.innerText + checkmark;
      setCheckmark(s);
    });
  },
  a: () => {
    auth_text.style.opacity = "0.5";
    [auth, calculate].forEach((s) => {
      setCheckmark(s);
    });
    auth.innerHTML = auth.innerText + checkmark;
  },
  s: () => {
    subscribe_text.style.opacity = "0.5";
    [subscribe, calculate].forEach((s) => {
      setCheckmark(s);
    });
    subscribe.innerHTML = subscribe.innerText + checkmark;
  },
};

/** check subscription and authorization */
const check = async () => {
  try {
    const response = await fetch(`/check?partner=${start_param}&user_id=${id}`);
    const { is_subscribed, is_authorized } = await response.json();

    root = is_authorized.root;

    const checks = {
      no_sub: !is_subscribed,
      a: is_authorized.success && !is_subscribed,
      as: is_authorized.success && is_subscribed,
      s:
        (!is_authorized.success || is_authorized.success == undefined) &&
        is_subscribed,
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
    console.error("Error:", error);
  }
};

/** validation */
const fetchData = async () => {
  try {
    const response = await fetch(`/validate-init?${tg.initData}`);
    const data = await response.json();
  } catch (error) {
    console.error("Error:", error);
  }
};

/** get partner settings */
async function get_settings() {
  try {
    const response = await fetch(`/get-settings?partner=${start_param}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const res = await response.text();
    const { data } = JSON.parse(res);
    if (data) {
      const { work_type, percent } =
        JSON.parse(localStorage.getItem(start_param)) || data;
      work_type_partner = work_type;
      percent_partner = percent;

      if ((work_type_partner && percent_partner) || work_type_partner) {
        settings.innerHTML = settings.innerText + checkmark;
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
}

/** event listeners */
subscribe.addEventListener("click", function () {
  tg.openTelegramLink(channel);
});

auth.addEventListener("click", function () {
  let href;
  if (start_param !== null) {
    console.log(start_param);
    href = `/auth?partner=${start_param}&user=${username}&id=${id}`;
  } else {
    console.log(start_param);
    href = `/registration?&user=${username}&id=${id}`;
  }
  window.location.href = href;
});

settings.addEventListener("click", function () {
  window.location.href = `/settings?partner=${start_param}&user=${username}&id=${id}`;
});

calculate.addEventListener("click", async function () {
  if (work_type_partner || (work_type_partner && percent_partner)) {
    window.location.href = `/pre-calc?partner=${start_param}`;
  } else {
    tg.showPopup({ message: "Вначале заполните и сохраните настройки" });
  }
});

/** CHECK MODERATION */
async function check_registration() {
  if (start_param !== 'super-root') {
    try {
      const check_response = await fetch(
        `/check-registration-moderation?user_id=${id}&partner_id=${start_param}`
      );
      const { success } = await check_response.json();

      if (success.true === true) {
        return { success: true, uid: success.uid };
      } else if (!success) {
        return { success: false };
      } else if (success === "moderation") {
        return { success: "moderation" };
      }
    } catch (error) {
      console.error(`Error in check_registration: ${error}`);
      return { success: false };
    }
  } else {
    return { success: "super_root" };
  }
}

/** PRELOADER */
async function preload() {
  await fetchData();
  const { success, uid } = await check_registration();
  start_param = uid ? uid : start_param;
  await check();
  await get_settings();

  const actions = {
    moderation: () => {
      preloader.style.display = "none";
      success_checkmark.style.display = "block";
      success_text.style.display = "block";
    },
    false: () => {
      if (start_param === null) {
        el_arr.forEach((el) => (el.style.display = "none"));
      }

      preloader.style.display = "none";
      container.style.display = "flex";
    },
    true: () => {
      if (calc && !partner && partner === null) {
        window.location.href = `/pre-calc?partner=${start_param}`;
      }

      if (do_reg && !partner && partner === null) {
        window.location.href = `/auth?partner=${start_param}&user=${username}&id=${id}`;
      }

      if (price && !partner && partner === null) {
        window.location.href = `/price?partner=${start_param}`;
      }

      if (!root) {
        settings.style.display = "none";
        settings_text.style.display = "none";
      }

      preloader.style.display = "none";
      container.style.display = "flex";
    },
    super_root: () => {
      href = `/registration?&super_root=true`;
      window.location.href = href;
    }
  };

  actions[success] && actions[success]();
}

preload();
