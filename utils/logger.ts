import * as winston from 'winston'
import { addColors, createLogger, format, transports } from 'winston'

const level = () => {
    const env = process.env.NODE_ENV ?? 'development'
    const isDevelopment = env === 'development'
    return isDevelopment ? 'debug' : 'warn'
}

class Logger {
    private readonly logger: winston.Logger

    constructor() {
        // Logging configuration
        const levels = {
            debug: 4,
            error: 0,
            http: 3,
            info: 2,
            warn: 1,
        }

        const colors = {
            debug: 'white',
            error: 'red',
            http: 'magenta',
            info: 'green',
            warn: 'yellow',
        }

        addColors(colors)

        const combinedFormat = format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.colorize({ all: true }),
            format.errors({ stack: true }),
            format.printf((info) => `${info.timestamp} ${info.level}: ${info.stack || info.message}`),
        )

        const CombinedTransports = [new transports.Console()]

        this.logger = createLogger({
            format: combinedFormat,
            level: level(),
            levels,
            transports: CombinedTransports,
        })
    }

    public debug(message: string): void {
        this.logger.debug(message)
    }

    public error(message: string): void {
        this.logger.error(message)
    }

    public http(message: string): void {
        this.logger.http(message)
    }

    public info(message: string): void {
        this.logger.info(message)
    }

    public warn(message: string): void {
        this.logger.warn(message)
    }
}

const logger = new Logger()
export default logger
