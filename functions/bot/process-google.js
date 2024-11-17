import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { create_folder, save_media } from "../drive.js";
import { get_partner_name_and_manager, do_calc } from "../sheets.js";
import { constants } from "../../constants.js";
import { process_return_json, deleteDataFromJson } from "../process-json.js";
import { HQD_photo, parse_text } from "../helper.js";

const { BOT_TOKEN, media_files_obj_path, calc_data_obj_path, parse_mode } = constants;

/**
 * Retrieve file URLs from Telegram based on the provided files data.
 * @param {Array|String} files - Object or Array containing data of files to be processed.
 * @returns {array|string} - An array of file URLs if multiple files are provided, or a single file URL.
 */
const getTelegramFiles = async (files) => {
    let fileUrls = [];
    if (Array.isArray(files)) {
        for (const { media, mime_type } of files) {
            try {
                const { file_path } = await bot.getFile(media);
                const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
                logger.info(`File url successfully received: ${fileUrl}`);
                fileUrls.push({ fileUrl, mime_type });
            } catch (error) {
                logger.error(`Error in getTelegramFiles: ${error}`);
            }
        }
    }
    return fileUrls;
};

/**
* Process and calculate the data asynchronously.
*
* @param {Object} data - The data object containing text to parse, partner information, and message details.
*/
const process_calc = async (data) => {
    const { message, message_id, hash, hash_folder_id } = data;
    let agent_id;
    const obj = await process_return_json(calc_data_obj_path);
    logger.info(hash);
    logger.info(obj);
    logger.info(hash_folder_id);
    const { phone, name, brand, model, gosnum } = obj[hash];
    agent_id = parse_text(message.text).agent_id;
    const { link } = await do_calc({
        partner: agent_id,
        phone,
        name,
        brand,
        model,
        gosnum,
        folderId: hash_folder_id,
    });

    if (link) {
        await bot.sendMessage(
            id,
            `Расчет создан, [открыть](${link})\n\n\`hash:${hash_folder_id}\``,
            {
                reply_to_message_id: message_id,
                parse_mode,
                disable_web_page_preview: true,
            }
        );
    }

    await deleteDataFromJson(calc_data_obj_path, hash);
};

/**
* Processes and saves media content based on the provided data.
* @param {Object} data - Data containing information about the media content.
*/
const process_save = async (data) => {
    let media_data;

    if (!data.message.caption && !data.exist_folder) return;

    try {
        const { message_id, id, message, hash_folder_id, is_bot } = data;

        const media = message.photo
            ? HQD_photo(message.photo)
            : message.video
                ? message.video
                : message.voice
                    ? message.voice
                    : message.document
                        ? message.document
                        : "";

        let agent_id;
        let agent_name;
        let chat_id;
        let hash_id;
        let text_to_parse = message.text || message.caption;

        if (text_to_parse) {
            const d = parse_text(text_to_parse);
            agent_id = d.agent_id;
            agent_name = d.agent_name;
            chat_id = d.chat_id;
            hash_id = d.hash_id;
        }

        logger.info(`message hash_id: ${hash_id}`);

        const media_obj = await process_return_json(media_files_obj_path);

        const selectedData = Object.entries(media_obj).find(([k, v]) => {
            const [c_chat_id, hash] = k.split("_");
            if (v.hash_partner && !hash_id && !is_bot) {
                const d = parse_text(v.hash_partner);
                agent_id = d.agent_id;
                agent_name = d.agent_name;
                chat_id = d.chat_id;
                return (
                    c_chat_id === d.chat_id &&
                    hash === d.hash_id &&
                    v.data &&
                    v.data.length > 0
                );
            } else {
                return (
                    c_chat_id === chat_id &&
                    v.hash_id === hash_id &&
                    v.data &&
                    v.data.length > 0
                );
            }
        });

        let folder = {};

        if (hash_folder_id) {
            folder.id = hash_folder_id;
            folder.folderLink = `https://drive.google.com/drive/folders/${folder.id}`;
        } else {
            const { partner_folder } = await get_partner_name_and_manager(agent_id);
            folder = await create_folder(
                `${hash_id || uuidv4()}-${agent_name}`,
                partner_folder
            );
        }

        media_data = selectedData
            ? selectedData[1].data
            : [
                {
                    media: media.file_id,
                    mime_type: !media.mime_type ? "image/png" : media.mime_type,
                },
            ];

        const fileUrls = await getTelegramFiles(media_data);
        const { success } = await save_media({ fileUrls, folder: folder.id });

        if (success) {
            await bot.sendMessage(
                id,
                `Медиа контент сохранен в [папку](${folder.folderLink})\n\n\`hash_folder:${folder.id}\``,
                {
                    reply_to_message_id: message_id,
                    parse_mode,
                    disable_web_page_preview: true,
                }
            );
        }
    } catch (error) {
        logger.error(`Error in process_save: ${error}`);
    }
};

export { process_calc, process_save };