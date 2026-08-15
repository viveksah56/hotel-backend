import { prisma } from '../config/db.connect.js';
import { ApiError } from '../utils/api.error.js';
import { paginateQuery } from '../helper/pagination.js';
import type { PaginationParams, PaginatedResult } from '../helper/pagination.js';
import type { Hotel, HotelType, HotelStatus, Prisma } from '../../generated/prisma/client.js';
import { uploadMultipleImages, deleteImage, extractPublicId } from './cloudinary.service.js';
import { stripUndefined } from '../utils/strip-undefined.js';

interface Requester {
    id: string;
    role: string;
}

interface CreateHotelData {
    name: string;
    description?: string | undefined;
    type?: HotelType | undefined;
    address: string;
    city: string;
    district?: string | undefined;
    country?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    amenities?: string[] | undefined;
}

interface UpdateHotelData {
    name?: string | undefined;
    description?: string | undefined;
    type?: HotelType | undefined;
    address?: string | undefined;
    city?: string | undefined;
    district?: string | undefined;
    country?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    phone?: string | undefined;
    email?: string | undefined;
    amenities?: string[] | undefined;
    removeImages?: string[] | undefined;
}

interface AdminUpdateHotelData extends UpdateHotelData {
    ownerId?: string | undefined;
    status?: HotelStatus | undefined;
    starRating?: number | undefined;
}

interface HotelListFilters extends PaginationParams {
    city?: string | undefined;
    type?: HotelType | undefined;
    status?: HotelStatus | undefined;
    minRating?: number | undefined;
    search?: string | undefined;
}

const HOTEL_SORT_FIELDS = ['createdAt', 'name', 'starRating'] as const;
const HOTEL_IMAGES_FOLDER = 'ghumnepal/hotels';
const MAX_HOTEL_IMAGES = 10;

function assertOwnerOrAdmin(hotel: { ownerId: string }, requester: Requester): void {
    if (hotel.ownerId !== requester.id && requester.role !== 'ADMIN') {
        throw new ApiError('You do not have permission to perform this action', 403);
    }
}

async function resolveImages(
    currentImages: string[],
    removeImages: string[] | undefined,
    newImageLocalPaths: string[],
): Promise<string[]> {
    let images = currentImages;

    if (removeImages && removeImages.length) {
        const toRemove = new Set(removeImages);
        images = images.filter((url: string) => !toRemove.has(url));

        await Promise.all(
            removeImages.map(async (url: string) => {
                const publicId = extractPublicId(url);
                if (publicId) {
                    await deleteImage(publicId).catch((error) => {
                        console.error('failed to delete hotel image', publicId, error);
                    });
                }
            }),
        );
    }

    if (newImageLocalPaths.length) {
        if (images.length + newImageLocalPaths.length > MAX_HOTEL_IMAGES) {
            throw new ApiError(`A hotel can have at most ${MAX_HOTEL_IMAGES} images`, 400);
        }

        const uploaded = await uploadMultipleImages(newImageLocalPaths, HOTEL_IMAGES_FOLDER);
        images = [...images, ...uploaded.map((image) => image.url)];
    }

    return images;
}

class HotelService {
    async createHotel(
        ownerId: string,
        data: CreateHotelData,
        imageLocalPaths: string[] = [],
    ): Promise<Hotel> {
        if (imageLocalPaths.length > MAX_HOTEL_IMAGES) {
            throw new ApiError(`A hotel can have at most ${MAX_HOTEL_IMAGES} images`, 400);
        }

        const uploaded = imageLocalPaths.length
            ? await uploadMultipleImages(imageLocalPaths, HOTEL_IMAGES_FOLDER)
            : [];

        const { name, address, city, ...optional } = data;

        return prisma.hotel.create({
            data: {
                name,
                address,
                city,
                ...stripUndefined(optional),
                ownerId,
                amenities: data.amenities ?? [],
                images: uploaded.map((image) => image.url),
            },
        });
    }

    async getHotelById(id: string): Promise<Hotel> {
        const hotel = await prisma.hotel.findFirst({
            where: { hotelId: id, isDeleted: false },
        });

        if (!hotel) {
            throw new ApiError('Hotel not found', 404);
        }

        return hotel;
    }

    async getAllHotels(filters: HotelListFilters): Promise<PaginatedResult<Hotel>> {
        const where: Prisma.HotelWhereInput = {
            isDeleted: false,
            ...(filters.city && { city: { equals: filters.city, mode: 'insensitive' } }),
            ...(filters.type && { type: filters.type }),
            ...(filters.status && { status: filters.status }),
            ...(filters.minRating !== undefined && { starRating: { gte: filters.minRating } }),
            ...(filters.search && {
                OR: [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    { description: { contains: filters.search, mode: 'insensitive' } },
                ],
            }),
        };

        return paginateQuery<Hotel>(
            filters,
            HOTEL_SORT_FIELDS,
            (args) => prisma.hotel.findMany({ ...args, where }),
            () => prisma.hotel.count({ where }),
        );
    }

    async updateHotel(
        id: string,
        ownerId: string,
        data: UpdateHotelData,
        newImageLocalPaths: string[] = [],
    ): Promise<Hotel> {
        const existing = await prisma.hotel.findFirst({ where: { hotelId: id, isDeleted: false } });

        if (!existing) {
            throw new ApiError('Hotel not found', 404);
        }

        if (existing.ownerId !== ownerId) {
            throw new ApiError('You do not have permission to perform this action', 403);
        }

        const { removeImages, amenities, ...rest } = data;
        const images = await resolveImages(existing.images, removeImages, newImageLocalPaths);

        return prisma.hotel.update({
            where: { hotelId: id },
            data: {
                ...stripUndefined(rest),
                ...(amenities && { amenities }),
                images,
            },
        });
    }

    async adminUpdateHotel(
        id: string,
        data: AdminUpdateHotelData,
        newImageLocalPaths: string[] = [],
    ): Promise<Hotel> {
        const existing = await prisma.hotel.findFirst({ where: { hotelId: id, isDeleted: false } });

        if (!existing) {
            throw new ApiError('Hotel not found', 404);
        }

        if (data.ownerId && data.ownerId !== existing.ownerId) {
            const newOwner = await prisma.user.findFirst({
                where: { id: data.ownerId, isDeleted: false },
            });

            if (!newOwner) {
                throw new ApiError('New owner not found', 404);
            }
        }

        const { removeImages, amenities, ...rest } = data;
        const images = await resolveImages(existing.images, removeImages, newImageLocalPaths);

        return prisma.hotel.update({
            where: { hotelId: id },
            data: {
                ...stripUndefined(rest),
                ...(amenities && { amenities }),
                images,
            },
        });
    }

    async deleteHotel(id: string, requester: Requester): Promise<void> {
        const existing = await prisma.hotel.findFirst({ where: { hotelId: id, isDeleted: false } });

        if (!existing) {
            throw new ApiError('Hotel not found', 404);
        }

        assertOwnerOrAdmin(existing, requester);

        await prisma.hotel.update({
            where: { hotelId: id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
    }
}

const hotelService = new HotelService();

export default hotelService;