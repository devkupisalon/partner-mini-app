/**
 * Асинхронная функция fetchData для получения данных и заполнения выпадающего списка.
 */
async function fetchData() {
    const selectElement = document.getElementById('field_select-type');

    try {
        const response = await fetch('/getdata');
        console.log(response);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const text = await response.text();

        const data = JSON.parse(text);
        const flatValues = data.flat();

        flatValues.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.text = option;
            selectElement.appendChild(optionElement);
        });

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}