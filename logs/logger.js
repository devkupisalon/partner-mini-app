import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customTimeFormat = () => `,"time":"${new Date().toISOString()}"`;

if (!fs.existsSync(__dirname)) {
    fs.mkdirSync(__dirname, { recursive: true });
}

const logFilePath = path.join(__dirname, 'app.log');

/**
 * Инициализация логгера с указанием уровня логирования, формата времени, источников транспорта логов.
 */
const logger = pino({
    level: 'debug',
    timestamp: customTimeFormat,
    transport: ({
        targets: [{
            target: 'pino-pretty'
        },
        {
            target: 'pino/file', options: { destination: logFilePath, mkdir: true },
        }]
    }),
});

export default logger;