import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants } from "../../constants.js";
import { append_json_file, process_return_json, process_write_json } from "../process-json.js";
import { HQD_photo, p_success } from "../helper.js";

let { GROUP_CHAT_ID } = constants;
let media_files = {};
const { send_media_obj_path, media_files_obj_path, parse_mode } = constants;
GROUP_CHAT_ID = `-${GROUP_CHAT_ID}`;


/** Send media group message */
const send_media_group = async () => {
    const hash_id = uuidv4();
    const media_obj = await process_return_json(send_media_obj_path);

    try {
        if (Object.keys(media_obj).length > 0) {
            const mediaObjValues = Object.values(media_obj);

            for (let i = 0; i < mediaObjValues.length; i++) {
                const currentMediaObj = mediaObjValues[i];

                let {
                    caption,
                    mediaFiles,
                    message_id,
                    id,
                    chat_id,
                    reply_to_message_id,
                    from_user,
                    user_id,
                } = currentMediaObj;

                if (from_user) caption = `${caption.slice(0, -2)}:${hash_id}\``;

                const mediaGroup = mediaFiles.map(({ type, media }, index) => {
                    if (index === 0) {
                        return { type, media, caption, parse_mode };
                    }
                    return { type, media };
                });

                let message = reply_to_message_id
                    ? await bot.sendMediaGroup(chat_id, mediaGroup, {
                        reply_to_message_id,
                    })
                    : await bot.sendMediaGroup(chat_id, mediaGroup);

                if (message) {
                    p_success("media_group", message_id, id, GROUP_CHAT_ID);
                    if (from_user) process_save_media_to_obj(message, user_id, hash_id);
                    delete media_obj[Object.keys(media_obj)[i]];
                    await process_write_json(send_media_obj_path, media_obj);
                }
            }
        }
    } catch (error) {
        logger.error(`Error in send_media_group: ${error.stack}`);
    }
};

/**
 * Process and save media files from a message to the respective chat ID object.
 * @param {object} message - Message object containing media data.
 * @param {string} chat_id - ID of the chat where the media files are received.
 * @param {string} hash_id - hash.
 */
const process_save_media_to_obj = async (
    message,
    chat_id,
    hash_id,
    hash_partner
) => {
    const timestamp = new Date().getTime();

    if (!hash_partner) {
        if (!media_files[`${chat_id}_${timestamp}`]) {
            media_files[`${chat_id}_${timestamp}`] = {
                data: [],
                message_ids: [],
                experation_date: new Date().toISOString(),
                hash_id,
            };
        }

        Object.values(message).forEach(
            ({ message_id, photo, video, voice, document }) => {
                const media = photo
                    ? HQD_photo(photo).file_id
                    : video
                        ? video.file_id
                        : voice
                            ? voice.file_id
                            : document
                                ? document.file_id
                                : "";
                const mime_type = photo
                    ? "image/png"
                    : video
                        ? video.mime_type
                        : voice
                            ? voice.mime_type
                            : document
                                ? document.mime_type
                                : "";

                media_files[`${chat_id}_${timestamp}`].data.push({ media, mime_type });
                media_files[`${chat_id}_${timestamp}`].message_ids.push(message_id);
            }
        );
    } else {
        const { message_id, photo, video, voice, document, media_group_id } =
            message;
        if (!media_files[`${chat_id}_${media_group_id}`]) {
            media_files[`${chat_id}_${media_group_id}`] = {
                data: [],
                message_ids: [],
                experation_date: new Date().toISOString(),
                hash_id,
                hash_partner,
            };
        }

        const media = photo
            ? HQD_photo(photo).file_id
            : video
                ? video.file_id
                : voice
                    ? voice.file_id
                    : document
                        ? document.file_id
                        : "";
        const mime_type = photo
            ? "image/png"
            : video
                ? video.mime_type
                : voice
                    ? voice.mime_type
                    : document
                        ? document.mime_type
                        : "";

        media_files[`${chat_id}_${media_group_id}`].data.push({ media, mime_type });
        media_files[`${chat_id}_${media_group_id}`].message_ids.push(message_id);
    }

    await append_json_file(media_files_obj_path, media_files);
};

export { send_media_group, process_save_media_to_obj };