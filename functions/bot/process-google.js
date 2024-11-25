import { v4 as uuidv4 } from "uuid";

import bot from "./init-bot.js";
import logger from "../../logs/logger.js";

import { create_folder, save_media } from "../google/drive.js";
import { get_partners_data, do_calc } from "../google/sheets.js";
import { constants } from "../../constants.js";
import { process_return_json, deleteDataFromJson } from "../process-json.js";
import { HQD_photo, parse_text, prepare_calc, get_media_and_mime_type, return_success_condition } from "../helper.js";
import { success_calc_messages, success_save_messages } from "./messages.js";

const { BOT_TOKEN, media_files_obj_path, calc_data_obj_path, parse_mode, MINI_APP_LINK } = constants;

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

    const {
        message,
        message_id,
        hash,
        hash_folder_id,
        id,
        is_include_groups,
        partner_id,
        partner_name,
        partner_url,
        forward_from_id } = data;

    let agent_id, chat_id, obj;

    const chatId = !is_include_groups ? id : message.from.id;
    const options = !is_include_groups
        ? { reply_to_message_id: message_id, parse_mode, disable_web_page_preview: true }
        : { parse_mode, disable_web_page_preview: true };

    obj = !is_include_groups
        ? await process_return_json(calc_data_obj_path)
        : prepare_calc(message.reply_to_message.text, is_include_groups);

    const is_pre_order_exist = !is_include_groups && !obj[hash];

    if (is_pre_order_exist) {
        await bot.sendMessage(chatId, `Расчет для этого клинета уже создан, смотрите выше`, options);
        return;
    }
    const { phone, name, brand, model, gosnum } = !is_include_groups
        ? obj[hash]
        : obj;

    if (!is_include_groups) {
        const t = decodeURI(message.entities[0].url.toString().replace(MINI_APP_LINK, ''));
        const x = parse_text(t);
        agent_id = x.agent_id;
        chat_id = x.chat_id;
    } else {
        agent_id = partner_id;
        chat_id = forward_from_id;
    }

    const { link } = await do_calc({
        partner: agent_id,
        phone,
        name,
        brand,
        model,
        gosnum,
        folderId: hash_folder_id,
        chat_id
    });

    if (link) {
        const message_text = success_calc_messages[is_include_groups](name, brand, model, gosnum, partner_name, partner_url);
        await bot.sendMessage(chatId, message_text, options);
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
        const { message_id, id, message, hash_folder_id, is_bot, is_include_groups, partner_url, exist_folder } = data;
        const reply_to_message_id = message.reply_to_message?.message_id;
        const { photo, video, voice, document, entities, caption_entities } = message;
        const { media, mime_type } = get_media_and_mime_type(photo, video, voice, document, true);

        const _text = (entities && exist_folder
            ? entities[0].url
            : caption_entities[1].url)
            .toString().replace(MINI_APP_LINK, '');

        let agent_id, agent_name, chat_id, hash_id;
        let text_to_parse = decodeURI(_text);
        let folder = {};

        if (text_to_parse && !is_include_groups) {
            const d = parse_text(text_to_parse);
            agent_id = d.agent_id;
            agent_name = d.agent_name;
            chat_id = d.chat_id;
            hash_id = d.hash_id;
        }

        const media_obj = await process_return_json(media_files_obj_path);

        const selectedData = Object.entries(media_obj).find(([k, v]) => {
            const [c_chat_id, hash] = k.split("_");
            if (v.hash_partner && !hash_id && !is_bot) {
                const d = parse_text(v.hash_partner);
                agent_id = d.agent_id;
                agent_name = d.agent_name;
                chat_id = d.chat_id;
                if (!is_include_groups) {
                    return return_success_condition({ c_chat_id, d, hash, v })/* (
                        c_chat_id === d.chat_id &&
                        hash === d.hash_id &&
                        v.data &&
                        v.data.length > 0
                    ); */
                } else {
                    return return_success_condition({ c_chat_id, d, hash, v, reply_to_message_id }) /* (
                        c_chat_id === d.chat_id &&
                        hash === d.hash_id &&
                        v.data &&
                        v.data.length > 0 &&
                        v.message_ids.some(id => id === reply_to_message_id)
                    ) */
                }
            } else {
                return return_success_condition({ c_chat_id, chat_id, hash_id, v }) /* (
                    c_chat_id === chat_id &&
                    v.hash_id === hash_id &&
                    v.data &&
                    v.data.length > 0
                ); */
            }
        });

        if (hash_folder_id) {
            folder.id = hash_folder_id;
            folder.folderLink = `https://drive.google.com/drive/folders/${folder.id}`;
        } else {
            const { partner_folder } = await get_partners_data(chat_id);
            folder = await create_folder(
                `${hash_id || uuidv4()}-${agent_name}`,
                partner_folder
            );
        }

        media_data = selectedData ? selectedData[1].data : [{ media, mime_type }];

        const fileUrls = await getTelegramFiles(media_data);
        const { success } = await save_media({ fileUrls, folder: folder.id });

        if (success) {

            const options = !is_include_groups
                ? { reply_to_message_id: message_id, parse_mode, disable_web_page_preview: true }
                : { parse_mode, disable_web_page_preview: true };

            const chatId = !is_include_groups ? id : message.from.id;
            const message_text = success_save_messages[is_include_groups](agent_name, partner_url, folder);

            await bot.sendMessage(chatId, message_text, options);
        }
    } catch (error) {
        logger.error(`Error in process_save: ${error.stack}`);
    }
};

export { process_calc, process_save };