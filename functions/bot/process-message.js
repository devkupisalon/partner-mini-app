import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants } from "../../constants.js";
import { HQD_photo, prepare_calc, p_success, process_save_calc_data } from "../helper.js";
import { append_json_file } from "../process-json.js";

let { GROUP_CHAT_ID, DBLINK } = constants;
const { send_media_obj_path, parse_mode } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;

/** GLOBAL OBJ */
let send_media_obj = {};

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

    logger.info(message);

    const hash = `hash:${partner_id}:${message_id}:${id}:${partner_name}\n`;
    const partner_url = `${DBLINK}&range=${row}:${row}`;

    from_user
        ? (text = `Агент [${partner_name}](${partner_url}):\n\n${text}\n\n\`${hash}\``)
        : (text = text);

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
                ? `Агент [${partner_name}](${partner_url}):\n\n${message.caption}\n\n\`${hash}\``
                : text;
        } else {
            send_media_obj[key].text = from_user
                ? `Агент [${partner_name}](${partner_url}):\n\n\`${hash}\``
                : text;
        }

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
            p_success(type_m, message_id, id, GROUP_CHAT_ID);
        }
    } catch (error) {
        logger.error(`Error forwarding user message from chat_id ${id} to chat_id ${CHAT_ID}: ${error.stack}`);
    }
};

export { process_message };