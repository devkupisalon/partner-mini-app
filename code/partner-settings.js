/** Show  or hide percent input form */
function show(check) {
    let d = check ? 'flex' : 'none';
    percent_input.style.display = d;
    percent_text.style.display = d;
    if (!check) { percent_input.value = '' }
}

/** Show or hide percent onChange work type input */
async function show_percent(logo = undefined) {
    const selected_work_type = work_type_input.value;

    if (selected_work_type === partner_type) {
        show(true);
        if (logo && logo !== undefined) logo.style.display = "block";
    } else {
        show(false);
        if (logo && logo !== undefined) logo.style.display = "none";
    }

    work_type_input.onchange = show_percent;
}