document.addEventListener("DOMContentLoaded", function() {
    const preloaderElement = document.getElementById('preloader');
    
    if (preloaderElement) {
        fetch('/loader')
            .then(response => response.text())
            .then(data => {
                preloaderElement.innerHTML = data;
            });
    }
});