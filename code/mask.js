/** inputmask for percentage */
const percent_input = document.getElementById('partner-percent');
$(document).ready(function() {
    $('#partner-percent').inputmask({"mask": "99,99%"});
  });