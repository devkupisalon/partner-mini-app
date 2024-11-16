import { Readable } from "stream";

import gauth from "./google_auth.js";
import logger from "../logs/logger.js";

import { constants, __dirname } from "../constants.js";

const { drive } = gauth();
const { PARTNERSPARENT } = constants;

/**
 * Создать новую папку в Google Drive
 * @param {string} name - Имя новой папки
 * @returns {object} - Объект с ссылкой на папку и её ID, если успешно создана, иначе логируется ошибка
 */
const create_folder = async (name, parent_folder = PARTNERSPARENT) => {
  try {
    const response = await drive.files.create({
      resource: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent_folder],
      },
    });

    const {
      data: { id },
    } = response;
    const folderLink = `https://drive.google.com/drive/folders/${id}`;

    // Добавление разрешения для другого пользователя как owner
    await drive.permissions.create({
      fileId: id,
      requestBody: {
        role: "writer", // Роль доступа
        type: "domain", // Тип доступа
        domain: "kupisalon.ru", // Домен для разрешения
      },
    });

    if (id) {
      logger.info("Folder created successfully");
    }
    return { folderLink, id };
  } catch (error) {
    logger.error(`Error in create_folder: ${error.stack}`);
  }
};

/**
 * Retrieves file data from the specified URL and converts it into a Readable stream.
 * @param {string} url - The URL of the file to retrieve.
 * @returns {Readable} - A Readable stream with the file data.
 */
const get_blob = async (url) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const fileStream = new Readable({
    read() {
      this.push(uint8Array);
      this.push(null);
    },
  });
  return fileStream;
};

/**
 * Process the provided URL to fetch and extract necessary information of the file.
 * @param {string} url - URL of the file to be processed.
 * @param {string} mimeType - mimeType for media content.
 * @param {array} parents - Array of parent elements related to the file.
 * @returns {object} - Object containing the name, mimeType, file body, and parent elements of the processed file.
 */
const process_url = async (url, mimeType, parents) => {
  try {
    const body = await get_blob(url);
    const name = url.split("/").pop();

    const fileMetadata = {
      name,
      parents,
      mimeType,
    };

    const {
      data: { id },
    } = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType,
        body,
      },
      fields: "id",
    });

    if (id) {
      return { success: "success" };
    }
  } catch (error) {
    logger.error(`Error in process_url:${error}`);
  }
};

/**
 * Save media content to a separate folder in the Agent's folder on Google Drive.
 * @param {object} params - Parameters for saving media (name, folder, file)
 * @returns {object} - Object indicating the successful upload of the logo.
 */
const save_media = async (params) => {
  try {
    const { fileUrls, folder } = params;
    let success_data = [];

    for (const { fileUrl, mime_type } of fileUrls) {
      const data = await process_url(fileUrl, mime_type, [folder]);
      success_data.push(data);
    }

    if (
      success_data.every(({ success }) => success === "success") &&
      fileUrls.length === success_data.length
    ) {
      logger.info(`Files successfully uploaded to Agent folder`);
      return { success: "success" };
    }
  } catch (error) {
    logger.error(`Error in save_media: ${error.message}`);
  }
};

/**
 * Сохранить логотип партнера в его папку на Google Drive
 * @param {object} params - Параметры для сохранения логотипа (name, folder, file)
 * @returns {object} - Объект успешности загрузки, если логотип успешно загружен
 */
const save_logo = async (params) => {
  try {
    const {
      body: { name, folder },
      file,
    } = params;
    const mimeType = "image/png";

    const fileMetadata = {
      name,
      parents: [folder],
      mimeType,
    };

    const fileStream = new Readable();
    fileStream.push(file.buffer);
    fileStream.push(null);

    const {
      data: { id },
    } = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType,
        body: fileStream,
      },
      fields: "id",
    });

    if (id) {
      logger.info(`Logo successfully uploaded to partner folder`);
      return { success: "success" };
    }
  } catch (error) {
    logger.error(`Error in save_logo: ${error.message}`);
  }
};

export { save_logo, save_media, create_folder };
