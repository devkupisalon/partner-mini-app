import { google } from "googleapis";
import { constants } from "../../constants.js";

const { credentials_path } = constants;

/**
 * Функция gauth возвращает объект с авторизацией Google и экземплярами объектов для работы с Google Sheets и Google Drive.
 * @returns {Object} - Объект, содержащий экземпляры объектов для работы с таблицами Google Sheets и Google Drive, а также доступный access_token.
 */
const gauth = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentials_path,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents"
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });
  return { sheets, drive, docs, access_token: auth.getCredentials.access_token };
};

export default gauth;
