import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants } from "../../constants.js";
import { HQD_photo, prepare_calc, p_success, process_save_calc_data, parse_text } from "../helper.js";
import { append_json_file, process_return_json } from "../process-json.js";

let { GROUP_CHAT_ID, DBLINK, BOT_ID } = constants;
const { send_media_obj_path, agent_messages_obj_path, parse_mode } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

/**
 * Process message data to handle media files and forwarding messages.
 *
 * @param {object} data The data object containing message details.
 */
const process_message = async (data) => {
    let {
        text,
        partner_name,
        partner_id,
        message_id,
        id,
        photo,
        video,
        voice,
        document,
        media_group_id,
        message,
        from_user,
        chat_id,
        reply_to_message_id,
        row,
    } = data;

    const hash = `hash:${partner_id}:${message_id}:${id}:${partner_name}`;
    const partner_url = `${DBLINK}&range=${row}:${row}`;

    from_user
        ? text = `Агент [${partner_name}](${partner_url}):\n\n${text}\n\n[hash](https://${hash}.ru)`
        : text = text;

    if (from_user) {
        const { phone, name, brand, model, gosnum } = prepare_calc(text);
        if (phone && name && brand && model && gosnum) {
            await process_save_calc_data({
                phone,
                name,
                brand,
                model,
                gosnum,
                hash: hash.replace('hash:', '')
            });
        }
    }

    let CHAT_ID = from_user ? GROUP_CHAT_ID : chat_id;

    const type_m = photo
        ? "photo"
        : video
            ? "video"
            : voice
                ? "voice"
                : document
                    ? "document"
                    : "text";

    const media = photo
        ? HQD_photo(photo).file_id
        : video
            ? video.file_id
            : voice
                ? voice.file_id
                : document
                    ? document.file_id
                    : text;

    if (media_group_id) {
        let send_media_obj = await process_return_json(send_media_obj_path);
        const key = `${id}-${media_group_id}`;
        if (!send_media_obj[key])
            send_media_obj[key] = {
                message_id,
                media_group_id,
                id,
                mediaFiles: [],
                chat_id: CHAT_ID,
            };
        if (message.caption) {
            send_media_obj[key].caption = from_user
                ? `Агент [${partner_name}](${partner_url}):\n\n${message.caption}\n\n${hash}`
                : text;
        } /* else {
            send_media_obj[key].text = from_user
                ? `Агент [${partner_name}](${partner_url}):\n\n\`${hash}\``
                : text;
        } */

        const mediaTypeMap = {
            photo: "photo",
            video: "video",
            voice: "voice",
            document: "document",
            text: "",
        };

        const mediaType = mediaTypeMap[type_m];
        if (mediaType) {
            send_media_obj[key].mediaFiles.push({ type: mediaType, media: media });
        }

        if (!from_user) {
            send_media_obj[key].reply_to_message_id = reply_to_message_id;
        } else {
            send_media_obj[key].from_user = from_user;
            send_media_obj[key].user_id = id;
        }

        logger.info(`Media files prepared to send: ${JSON.stringify(send_media_obj[key])}`);
        await append_json_file(send_media_obj_path, send_media_obj);
        return;
    }

    logger.info(text);

    const options = from_user
        ? { caption: text, parse_mode, disable_web_page_preview: true }
        : { reply_to_message_id, caption: text, parse_mode };
    const default_options = from_user
        ? { parse_mode, disable_web_page_preview: true }
        : { parse_mode, reply_to_message_id };

    try {
        const data = await (type_m === "photo"
            ? bot.sendPhoto(CHAT_ID, media, options)
            : type_m === "video"
                ? bot.sendVideo(CHAT_ID, media, options)
                : type_m === "voice"
                    ? bot.sendVoice(CHAT_ID, media, options)
                    : type_m === "document"
                        ? bot.sendDocument(CHAT_ID, media, options)
                        : bot.sendMessage(CHAT_ID, media, default_options));

        if (data.message_id) {
            // await save_agent_message_to_json(data, { partner_id, message_id, id, partner_name,  });
            p_success(type_m, message_id, id, GROUP_CHAT_ID);
        }
    } catch (error) {
        logger.error(`Error forwarding user message from chat_id ${id} to chat_id ${CHAT_ID}: ${error.stack}`);
    }
};

/**
 * Function to save an agent message to a JSON file.
 * @param {object} data - The data containing the message information.
 * @param {object} hash - The hash value to be saved.
 */
const save_agent_message_to_json = async (data, hash) => {
    const { message_id, from: { id } } = data;
    const obj = {};
    const key = `${BOT_ID}-${message_id}-${id}`;
    if (!obj[key]) obj[key] = hash;
    await append_json_file(agent_messages_obj_path, obj);
};

/**
 * Function to get the message properties from an object asynchronously.
 * This function retrieves message properties by processing a JSON object and extracting relevant information.
 * @returns {Object} - The message properties extracted based on partner information.
 */
const get_message_property = async (reply_to_message_id) => {
    const obj = await process_return_json(agent_messages_obj_path);
    Object.entries(obj).forEach(async ([k, v]) => {
        const { partner_id, message_id, id, partner_name, hash_id } = v;
        const key = `${BOT_ID}-${reply_to_message_id}-${id}`;
        if (key === k) {
            return { partner_id, message_id, id, partner_name, hash_id };
        }
    });
};

export { process_message, get_message_property };