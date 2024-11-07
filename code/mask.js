/** inputmask for precentage */
function mask() {
    const percent_input = document.getElementById('partner-percent');
    const suffix = '%';
    const bypass = [9, 16, 17, 18, 36, 37, 38, 39, 40, 91, 92, 93];

    const saveValue = (data) => {
        percent_input.dataset.value = data;
    };

    const pureValue = () => {
        // let value = percent_input.value.replace(/\D/g, '');
        let value = parseInt(value.replace(suffix, ''))
        return value || '';
    };

    const focusNumber = () => {
        percent_input.setSelectionRange(percent_input.dataset.value.length, percent_input.dataset.value.length);
    };

    percent_input.addEventListener('keyup', (e) => {
        if (bypass.indexOf(e.keyCode) !== -1) return;

        const pure = pureValue();
        saveValue(pure);

        if (!pure) {
            percent_input.value = '';
            return;
        }

        percent_input.value = pure + suffix;
        focusNumber();
    });
}

mask();