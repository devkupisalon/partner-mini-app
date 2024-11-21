import gauth from "./google_auth.js";
import logger from "../../logs/logger.js";
import { constants } from "../../constants.js";

const { docs } = gauth();
const { DOCUMENT_ID_PRIVATE_POLiCY } = constants;


/**
 * Function to retrieve content from a Google Document with formatting preserved.
 * @returns {string} The content of the Google Document with preserved formatting.
 */
const getGoogleDocContent = async () => {

    try {
        const { data: { body } } = await docs.documents.get({ documentId: DOCUMENT_ID_PRIVATE_POLiCY });
        if (body) {
            logger.info(`Data from google doc fetched successfully`);
            const content = body
                .content.map((element) => element.paragraph.elements
                    .map((el) => el.textRun.content)
                    .join('')).join('\n');
            return content;
        }
    } catch (error) {
        logger.error("Error in getGoogleDocContent:", error.stack);
        return null;
    }
};

export { getGoogleDocContent };