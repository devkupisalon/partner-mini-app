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