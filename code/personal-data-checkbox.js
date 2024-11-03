const checkbox = document.getElementById('personal-data-checkbox');
const label = document.getElementById('personal-data-id');

// Слушаем изменения состояния чекбокса
checkbox.addEventListener('change', function() {
    if (checkbox.checked) {
        tg,MainButton.disabled(); 
        label.style.color = 'initial'; 
    } else {
        tg.MainButton.enabled(); 
        label.style.color = 'red';
    }
});