import { constants } from "../../constants.js";

const { MINI_APP_LINK, PDF_LINK, CONDITIONS_LINK } = constants;

/** OBJECT WITH MESSAGES OPTIONS */
const messages_map = {
    fisrt_message: {
        Агент: {
            text: `Добрый день!
Приветствуем вас в компании «Купи Салон». Уверены, что наше сотрудничество будет успешным и взаимовыгодным.
С уважением,
Команда Куписалон`,
        },
        Партнер: {
            text: `Здравствуйте!
Мы рады приветствовать вас среди наших партнеров. Давайте вместе создавать новые возможности и повышать удовлетворенность клиентов.
С уважением,
Куписалон`,
        },
    },
    manager_registr_message: {
        Партнер: {
            text: `Приглашаем Ваших менеджеров присоединиться к нашей партнерской программе.
Для регистрации используйте кнопку ниже.`,
            url: (uid) => {
                return `${MINI_APP_LINK}${uid}-reg-do-true`;
            },
            button_text: `Регистрация менеджера`,
        },
        link: true,
        to_pin: true,
    },
    calc_message: {
        Агент: {
            text: `Сделать расчёт стоимости для клиента можно по кнопке ниже.`,
            url: (uid) => {
                return `${MINI_APP_LINK}${uid}-calc-true`;
            },
            button_text: `Создать расчет`,
        },
        Партнер: {
            text: `Сделать расчёт стоимости для клиента можно по кнопке ниже.`,
            url: (uid) => {
                return `${MINI_APP_LINK}${uid}-calc-true`;
            },
            button_text: `Создать расчет`,
        },
        link: true,
        to_pin: true,
    },
    helper_message: {
        Агент: {
            text: `Направляем вам материалы по работе в партнерской программе Куписалон. Если у вас появятся вопросы, мы с радостью на них ответим.
С наилучшими пожеланиями,
Куписалон`,
            url: (type) => { return [PDF_LINK(type), CONDITIONS_LINK] },
            button_text: [`Инструкция`, `Условия`],
        },
        Партнер: {
            text: `Направляем вам материалы по работе в партнерской программе Куписалон. Если у вас появятся вопросы, мы с радостью на них ответим.
С наилучшими пожеланиями,
Куписалон`,
            url: (type) => { return [PDF_LINK(type), CONDITIONS_LINK] },
            button_text: [`Инструкция`, `Условия`],
        },
        link: true,
        to_pin: true,
    },
    price_message: {
        Партнер: {
            text: `Посмотреть прайс можно по кнопке ниже.`,
            url: (uid) => {
                return `${MINI_APP_LINK}${uid}-price-true`;
            },
            button_text: `Прайс лист`,
        },
        Агент: {
            text: `Посмотреть прайс можно по кнопке ниже.`,
            url: (uid) => {
                return `${MINI_APP_LINK}${uid}-price-true`;
            },
            button_text: `Прайс лист`,
        },
        link: true,
        to_pin: true,
    },
};

const notify_manager_messages_map = {
    "Партнер": (
        partner_manager_name,
        partner_name,
        client_name,
        cars_data,
        date,
        link) => {
        return `*Новый расчет*
  
Сообщаем, что менеджер ${partner_manager_name} из компании ${partner_name} создал новый расчет.

*Информация о расчете:*
- Клиент: ${client_name}
- Автомобиль: ${cars_data}
- Дата создания: ${date}

*Ссылка для просмотра расчета:* [открыть](${link})

Если у вас есть вопросы или предложения, пожалуйста, свяжитесь с партнером.`;
    },
    "Агент": (
        partner_name,
        client_name,
        cars_data,
        date,
        link) => {
        return `*Информация о расчете:*

Сообщаем, что Агент ${partner_name} создал новый расчет.

*Информация о расчете:*
- Клиент: ${client_name}
- Автомобиль: ${cars_data}
- Дата создания: ${date}

*Ссылка для просмотра расчета:* [открыть](${link})

Пожалуйста, ознакомьтесь с расчетом и при необходимости свяжитесь с агентом для дальнейших действий.`
    }
};

/** INVITE TEXT MAP */
const invite_texts_map = {
    manager: (name) => {
        return `Создана новая группа с партнером ${name}, присоединяйтесь к группе по ссылке:`;
    },
    partner: (name) => {
        return `${name},
Ваша зявка на участие в нашей партнерской программе была успешно одобрена 🎉.
Присоединяйтесь к группе с менеджером по ссылке:`;
    },
};

/** SUCCESS CALC MESSAGES */
const success_calc_messages = {
    true: (name, brand, model, gosnum, link, hash_folder_id, partner_name, partner_url) => {
        return `Расчет для Партнера [${partner_name}](${partner_url}) создан, [открыть](${link})\n\n\`hash_folder:${hash_folder_id}\`\n\nИмя клиента: ${name}\nМарка и модель: ${brand} ${model}\nГосномер: ${gosnum}\n\n`
    },
    false: (name, brand, model, gosnum, link, hash_folder_id, partner_name, partner_url) => {
        return `Расчет для Агента [${partner_name}](${partner_url}) создан, [открыть](${link})\n\n\`hash_folder:${hash_folder_id}\`\n\nИмя клиента: ${name}\nМарка и модель: ${brand} ${model}\nГосномер: ${gosnum}\n\n`
    },
}

    ;
export { messages_map, invite_texts_map, notify_manager_messages_map, success_calc_messages };