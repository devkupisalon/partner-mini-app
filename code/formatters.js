function formatPhoneNumber(input) {
    input.value = input.value.replace(/[^\d]/g, '');
    input.value = input.value.slice(0, 13);
  }
  
  function validateName(input) {
    let value = input.value;
  
    value = value.replaceAll(/\d+/g, '');
    input.value = value;
  }