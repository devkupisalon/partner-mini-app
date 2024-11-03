import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const constants = {
    BOT_TOKEN: process.env.bot_token,
    KUPISALONID: process.env.kupisalonID,
    SPREADSHEETID: process.env.spreadsheetID,
    DB: process.env.DBPARTNERS,
    SHEETNAME: process.env.sheetName,
    GROUPSSHEETNAME: process.env.groups_sheetname,
    DATASHEETNAME: process.env.datasheetname,
    VALUE: process.env.value,
    CARSSHEETNAME: process.env.carssheetname,
    CARSSPREADSHEET: process.env.CARSSPREADSHEET,
    MONITORSHEETNAME: process.env.monitorsheetname,
    MONITORSPREADSHEET: process.env.MONITORSPREADSHEET,
    PARTNERSPARENT: process.env.partnersparent,
    WEBAPPURL: process.env.webappurl,
    GROUP_CHAT_ID: process.env.GROUP_CHAT_ID,
    MINI_APP_LINK: process.env.MINI_APP_LINK,
    PDF_LINK: process.env.PDF_LINK,
    HOME: `${__dirname}/html/mini-app-main.html`,
    AUTH: `${__dirname}/html/auth-web-app.html`,
    SETTINGS: `${__dirname}/html/settings-web-app.html`,
    PRE_CALC: `${__dirname}/html/pre-calculation.html`,
    REGISTR: `${__dirname}/html/registration.html`
};

const { MINI_APP_LINK, PDF_LINK } = constants;

/** OBJECT WITH MESSAGES OPTIONS */
const messages_map = {
    fisrt_message: {
        'Агент': {
            text: `Добрый день!
Приветствуем вас в компании «Купи Салон». Уверены, что наше сотрудничество будет успешным и взаимовыгодным.
С уважением,
Команда Куписалон`},
        'Партнер': {
            text: `Здравствуйте!
Мы рады приветствовать вас среди наших партнеров. Давайте вместе создавать новые возможности и повышать удовлетворенность клиентов.
С уважением,
Куписалон` }
    },
    manager_registr_message: {
        'Партнер': {
            text: `Приглашаем Ваших менеджеров присоединиться к нашей партнерской программе.
Для регистрации используйте кнопку ниже.`,
            url: (uid) => { return `${MINI_APP_LINK}${uid}`; },
            button_text: `Регистрация менеджера`
        }, link: true,
        to_pin: true
    },
    calc_message: {
        'Агент': {
            text: `Сделать расчёт стоимости для клиента можно по кнопке ниже.`,
            url: (uid) => { return `${MINI_APP_LINK}${uid}-calc-true`; },
            button_text: `Создать расчет`
        },
        'Партнер': {
            text: `Сделать расчёт стоимости для клиента можно по кнопке ниже.`,
            url: (uid) => { return `${MINI_APP_LINK}${uid}-calc-true`; },
            button_text: `Создать расчет`
        },
        link: true,
        to_pin: true
    },
    helper_message: {
        'Агент': {
            text: `Направляем вам материалы по работе в партнерской программе Куписалон. Если у вас появятся вопросы, мы с радостью на них ответим.
С наилучшими пожеланиями,
Куписалон`,
            url: PDF_LINK,
            button_text: `Инструкция`
        },
        'Партнер': {
            text: `Направляем вам материалы по работе в партнерской программе Куписалон. Если у вас появятся вопросы, мы с радостью на них ответим.
С наилучшими пожеланиями,
Куписалон`,
            url: PDF_LINK,
            button_text: `Инструкция`
        }, link: true,
        to_pin: true
    }
};

/** INVITE TEXT MAP */
const invite_texts_map = {
    manager: (name) => { return `Создана новая группа с партнером ${name}, присоединяйтесь к группе по ссылке:` },
    partner: (name) => {
        return `${name},
Ваша зявка на участие в нашей партнерской программе была успешно одобрена 🎉.
Присоединяйтесь к группе с менеджером по ссылке:`}
};

export { constants, __dirname, messages_map, invite_texts_map };