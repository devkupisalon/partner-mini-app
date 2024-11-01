/** Show  or hide percent input form */
function show(check) {
    console.log('test');
    let d = check ? 'flex' : 'none';
    percent_input.style.display = d;
    percent_text.style.display = d;
    if (!check) { percent_input.value = '' }
}

/** Show or hide percent onChange work type input */
async function show_percent() {
    const selected_work_type = work_type_input.value;

    if (selected_work_type === partner_type) {
        show(true);
    } else {
        show(false);
    }

    work_type_input.onchange = show_percent;
}