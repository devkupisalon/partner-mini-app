import { invite_texts_map, messages_map } from "./messages.js";
import bot from "./init-bot.js";
import logger from "../../logs/logger.js";
import { get_logo } from "../google/drive.js";
import { __dirname } from "../../constants.js";

/**
 * Send first init messages to user
 * @param {string} chat_id - user chat_id
 * @param {string} type - Agent or Partner
 * @param {string} uid - Partner ID
 * @param {string} group_id  - group ID
 * @param {string} manager_chat_id - Manager chat_id
 * @param {string} name - Partner nname
 */
const send_first_messages = async (
    chat_id,
    type,
    uid,
    group_id,
    manager_chat_id,
    name,
    success_send
) => {
    let CHAT_ID;
    let is_invite_send = false;

    try {
        for await (const k of Object.keys(messages_map)) {
            const { link, to_pin } = messages_map[k];
            if (messages_map[k][type]) {
                const { url, text, button_text } = messages_map[k][type];
                const create_url =
                    typeof url === "function" && k === 'helper_message'
                        ? url(type)
                        : typeof url === "function"
                            ? url(uid)
                            : url;

                const messageOptions = {
                    link: {
                        message_text_option: text,
                        reply_markup: {
                            inline_keyboard: k === 'helper_message'
                                ? create_url.map((r, i) => [{ text: button_text[i], url: r }])
                                : [[{ text: button_text, url: create_url }]],
                        },
                    },
                    text: {
                        message_text_option: text,
                    },
                };

                const messageType = link ? "link" : "text";
                const { message_text_option, reply_markup } =
                    messageOptions[messageType];
                CHAT_ID = group_id ? `-100${group_id}` : chat_id;

                if (type === "Партнер" && !is_invite_send) {
                    try {
                        await set_chat_title(CHAT_ID, `Рабочая группа с Партнером ${name}`);
                    } catch (error) {
                        logger.error(`Partner chat ID not found: ${error.stack}`);
                    }

                    await send_group_invite_link(
                        CHAT_ID,
                        { partner: chat_id, manager: manager_chat_id },
                        invite_texts_map,
                        name
                    );
                    is_invite_send = true;
                }

                const { message_id } = await (link
                    ? bot.sendMessage(CHAT_ID, message_text_option, { reply_markup })
                    : bot.sendMessage(CHAT_ID, message_text_option));

                if (message_id) {
                    logger.info("Message successfully sent to the user");
                    if (to_pin) {
                        await bot.pinChatMessage(CHAT_ID, message_id);
                        logger.info(`Message with id ${message_id} successfully pinned`);
                    }
                }
            }
        }

        return { success: true, success_send_check: success_send };
    } catch (error) {
        logger.error(`Error sending messages: ${error.stack}, ${CHAT_ID}`);
        return { succces: false, success_send_check: false };
    }
};

/**
 * Function to send group invite link to users.
 * @param {string} groupId - The ID of the group from which to get the invite.
 * @param {Object} user_ids - Object of user IDs to send the invite to.
 * @param {Object} map - Object mapping user IDs to personalized messages.
 * @param {string} name - Name of invited organization.
 */
const send_group_invite_link = async (groupId, user_ids, map, name) => {
    await bot
        .exportChatInviteLink(groupId)
        .then((inviteLink) => {
            Object.keys(user_ids).forEach((k) => {
                bot.sendMessage(user_ids[k], `${map[k](name)} ${inviteLink}`);
            });
        })
        .catch((error) => {
            logger.error(`Error while export chat_invite_link: ${error}`);
        });
};

/**
 * Function to set the title of a group chat.
 * @param {string} groupId - The ID of the group where the title will be changed.
 * @param {string} newTitle - The new title for the group chat.
 */
const set_chat_title = async (groupId, newTitle) => {
    bot
        .setChatTitle(groupId, newTitle)
        .then(() => {
            logger.info(
                `Group chat title with id:${groupId} changed to: ${newTitle}`
            );
        })
        .catch((error) => {
            logger.error(
                `Error while changing group chat title with id:${groupId} : ${error}`
            );
        });
};

/**
 * Set chat photo for a specific chat ID using the provided photo Blob.
 * @param {string} chatId - The ID of the chat where the photo will be set.
 * @param {string} root_chat_id - The ID of the telegram.
 */
const set_chat_photo = async (chatId, root_chat_id) => {
    const photoBlob = await get_logo(root_chat_id);
    // console.log(await photoBlob.stream());

    const b = await photoBlob.arrayBuffer();
    const photoBuffer = Buffer.from(b);

    // Создание Readable stream и передача файла в поток
    // const fileStream = new Readable({
    //     read() {
    //         this.push(photoBuffer);
    //         this.push(null);
    //     },
    //     objectMode: false,
    // });

    const formData = new FormData();
    formData.append('photo', photoBlob, 'photo.png');
    // console.log(formData);


    // const b = await photoBlob.arrayBuffer();
    // console.log(b);
    // const photoBuffer = Buffer.from(b);
    // console.log(photoBuffer);

    // const fileStream = new Readable();
    // fileStream.push(photoBuffer);
    // fileStream.push(null);

    // fileStream.headers = {
    //     'Content-Type': 'image/png',
    // };

    // console.log(fileStream);

    try {
        const result = await bot.setChatPhoto(chatId, formData);
        logger.info(`Photo set successfully: ${result}`);
    } catch (error) {
        logger.error(`Error setting photo: ${error}`);
    }
};

export { send_first_messages };