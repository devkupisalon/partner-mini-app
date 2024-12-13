import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { constants } from "../../constants.js";
import { append_json_file, process_return_json, deleteDataFromJson } from "../process-json.js";
import { p_success, get_media_and_mime_type, initialize_media_files_entry } from "../helper.js";

let { GROUP_CHAT_ID, MINI_APP_LINK } = constants;
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
                    text,
                    mediaFiles,
                    message_id,
                    id,
                    chat_id,
                    reply_to_message_id,
                    from_user,
                    user_id,
                } = currentMediaObj;

                if (from_user) {
                    const new_caption = caption ? `${caption}:${hash_id}` : '';
                    const new_c = new_caption.replace(/hash:(.*)/, (match, p1) => `[hash](${MINI_APP_LINK}hash:${p1})`);
                    caption = new_c;
                }

                const mediaGroup = mediaFiles.map(({ type, media }, index) => {
                    if (index === 0) {
                        return { type, media, caption: caption ? caption : text, parse_mode };
                    }
                    return { type, media };
                });

                let message = reply_to_message_id
                    ? await bot.sendMediaGroup(chat_id, mediaGroup, { reply_to_message_id })
                    : await bot.sendMediaGroup(chat_id, mediaGroup);

                if (message) {
                    p_success("media_group", message_id, id, GROUP_CHAT_ID);
                    if (from_user) process_save_media_to_obj(message, user_id, hash_id);
                    await deleteDataFromJson(send_media_obj_path, Object.keys(media_obj)[i]);
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
const process_save_media_to_obj = async (message, chat_id, hash_id, hash_partner) => {
    const timestamp = new Date().getTime();
    const key = `${chat_id}_${timestamp}`;
    let media_files = await process_return_json(media_files_obj_path);

    if (!hash_partner) {
        media_files[key] = media_files[key] || initialize_media_files_entry(hash_id);

        Object.values(message).forEach(
            ({ message_id, photo, video, voice, document }) => {
                const { media, mime_type } = get_media_and_mime_type(photo, video, voice, document, true);

                media_files[key].data.push({ media, mime_type });
                media_files[key].message_ids.push(message_id);
            }
        );
    } else {
        const { message_id, photo, video, voice, document, media_group_id } = message;
        const media_key = `${chat_id}_${media_group_id}`;
        media_files[media_key] = media_files[media_key] || initialize_media_files_entry(hash_id, hash_partner);
        const { media, mime_type } = get_media_and_mime_type(photo, video, voice, document, true);

        media_files[media_key].data.push({ media, mime_type });
        media_files[media_key].message_ids.push(message_id);
    }

    await append_json_file(media_files_obj_path, media_files);
};

export { send_media_group, process_save_media_to_obj };