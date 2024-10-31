/**
 * Устанавливает стили для элемента с выполненной отметкой.
 * @param {HTMLElement} s - Элемент, для которого устанавливаются стили.
 */
const setCheckmark = s => {
    s.style.pointerEvents = "none";
    s.style.opacity = "0.5";
};

/**
 * Асинхронная функция fetchCheck для проверки данных через запрос fetch.
 * @param {string} string - Строка для валидации через запрос.
 * @returns {boolean} - Результат, true в случае успешной проверки, false в противном случае.
 */
const fetchCheck = async (string) => {
    try {
        const response = await fetch(`/validate-init?${string}`);
        const data = await response.json();
        return data ? true : false;
    } catch (error) {
        console.error('Error:', error);
    }
};

/**
 * Обработчик события клика на кнопке fill_tg для запроса контакта и обработки данных.
 */
fill_tg.addEventListener('click', async () => {
    await tg.requestContact(async (shared, callback) => {
        if (shared && callback) {
            const check = await fetchCheck(callback.response);
            console.log(callback);
            if (check) {
                const contact = callback.responseUnsafe.contact;
                n.value = `${ contact.first_name } ${ contact.last_name }`;
                ph.value = contact.phone_number;
                setCheckmark(fill_tg);
            } else {
                console.error('Data is not valid');
            }
        }
    });
});