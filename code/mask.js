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
        // Ограничиваем значение до максимального числа 100
        value = parseInt(value.replace(suffix, '') > 100 ? 100 : value.replace(suffix, ''));
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

        // Ограничиваем количество знаков после запятой до 2
        const formattedValue = (pure / 100).toLocaleString('en-US', {maximumFractionDigits: 2});
        
        // Проверяем, чтобы значение не превышало 100
        percent_input.value = parseFloat(formattedValue) > 100 ? '100' + suffix : formattedValue + suffix;
        focusNumber();
    });
}

mask();