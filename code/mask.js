/** inputmask for percentage */
function mask() {
    const percent_input = document.getElementById('partner-percent');
    const suffix = '%';
    const bypass = [9, 16, 17, 18, 36, 37, 38, 39, 40, 91, 92, 93];

    const saveValue = (data) => {
        percent_input.dataset.value = data;
    };

    const pureValue = () => {
        let value = percent_input.value.replace(/\D/g, ''); // Убираем все символы, кроме цифр
        // Заменяем точку на запятую, чтобы обеспечить корректное число с плавающей точкой
        value = value.replace('.', ',');
        value = parseInt(value.replace(suffix, ''));
        return value || '';
    };

    const focusNumber = () => {
        percent_input.setSelectionRange(percent_input.dataset.value.length, percent_input.dataset.value.length);
    };

    percent_input.addEventListener('keyup', (e) => {
        if (bypass.includes(e.keyCode)) return;

        const pure = pureValue();
        saveValue(pure);

        if (!pure) {
            percent_input.value = '';
            return;
        }

        // Если введено число не целое, отображаем его с запятой и добавляем суффикс
        percent_input.value = pure.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + suffix;
        focusNumber();
    });
}

mask();