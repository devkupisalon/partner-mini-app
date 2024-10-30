const setCheckmark = s => {
    s.style.pointerEvents = "none";
    s.style.opacity = "0.5";
  };

const fetchCheck = async (string) => {
    try {
        const response = await fetch(`/validate-init?${string}`);
        const data = await response.json();
        console.log(data);
        return data ? true : false;
    } catch (error) {
        console.error('Error:', error);
    }
};

fill_tg.addEventListener('click', async () => {
    await tg.requestContact(async (shared, callback) => {
        if (shared && callback) {
            const check = await fetchCheck(callback.response);
            console.log(callback);
            if (check) {
                const contact = callback.responseUnsafe.contact;
                n.value = `${contact.first_name} ${contact.last_name}`;
                ph.value = contact.phone_number;
                setCheckmark(fill_tg);
            } else {
                console.error('Data is not valid');
            }
        }
    });
});