import multer from 'multer';
import path from 'node:path';
import os from 'node:os';
import { ApiError } from '../utils/api.error.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(new ApiError('Only JPEG, PNG, or WEBP images are allowed', 400));
            return;
        }
        cb(null, true);
    },
});

export const fileUpload = (fieldName: string) => upload.single(fieldName);

export const fileUploadArray = (fieldName: string, maxCount = 5) => upload.array(fieldName, maxCount);