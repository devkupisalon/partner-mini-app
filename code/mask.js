/** 
 * inputmask for percentage 
 * Allows input of comma instead of dot and replaces dot with comma. Only allows one comma in the input.
 */
function mask() {
    const percent_input = document.getElementById('partner-percent');
    const suffix = '%';
    const bypass = [9, 16, 17, 18, 36, 37, 38, 39, 40, 91, 92, 93];

    const saveValue = (data) => {
        percent_input.dataset.value = data;
    };

    const pureValue = () => {
        let value = percent_input.value.replace(/\D/g, '');
        // Replace dot with comma and ensure only one comma in the value
        value = value.replace('.', ',').replace(/,{2,}/g, ',');
        // Extracting the number part and parsing it as an integer
        value = parseInt(value.replace(suffix, ''));
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

        percent_input.value = pure.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + suffix;
        focusNumber();
    });
}

mask();