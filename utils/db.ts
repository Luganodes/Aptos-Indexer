import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/constants';
import logger from './logger';

export async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        logger.info(`Connected to MongoDB ${MONGODB_URI}`);
    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error}`);
        process.exit(1);
    }
}

export function disconnectFromDatabase() {
    return mongoose.disconnect();
}

