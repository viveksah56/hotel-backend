import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import fs from 'node:fs/promises';
import { envConfig } from '../config/env.config.js';
import { ApiError } from '../utils/api.error.js';

cloudinary.config({
    cloud_name: envConfig.CLOUDINARY.CLOUD_NAME,
    api_key: envConfig.CLOUDINARY.API_KEY,
    api_secret: envConfig.CLOUDINARY.API_SECRET,
    secure: true,
});

export interface UploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format: string;
}

async function removeLocalFile(localPath: string): Promise<void> {
    try {
        await fs.unlink(localPath);
    } catch (error) {
        console.error('failed to remove local file', localPath, error);
    }
}

export async function uploadImage(
    localPath: string,
    folder: string,
    options: UploadApiOptions = {},
): Promise<UploadResult> {
    let response: UploadApiResponse;

    try {
        response = await cloudinary.uploader.upload(localPath, {
            folder,
            resource_type: 'image',
            ...options,
        });
    } catch (error) {
        await removeLocalFile(localPath);
        console.error('Cloudinary upload failed', error);
        throw new ApiError('Failed to upload image', 502);
    }

    await removeLocalFile(localPath);

    return {
        url: response.secure_url,
        publicId: response.public_id,
        width: response.width,
        height: response.height,
        format: response.format,
    };
}

export async function uploadMultipleImages(
    localPaths: string[],
    folder: string,
    options: UploadApiOptions = {},
): Promise<UploadResult[]> {
    return Promise.all(localPaths.map((path) => uploadImage(path, folder, options)));
}

export async function deleteImage(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
        console.error('Cloudinary delete failed', publicId, error);
        throw new ApiError('Failed to delete image', 502);
    }
}

export async function deleteMultipleImages(publicIds: string[]): Promise<void> {
    if (publicIds.length === 0) return;

    try {
        await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
    } catch (error) {
        console.error('Cloudinary bulk delete failed', publicIds, error);
        throw new ApiError('Failed to delete images', 502);
    }
}

export function extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    return match ? (match[1] ?? null) : null;
}