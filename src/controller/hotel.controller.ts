import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { ApiError } from '../utils/api.error.js';
import hotelService from '../services/hotel.service.js';
import { UserRole } from '../constants/role.constant.js';
import type {
    CreateHotelInput,
    UpdateHotelInput,
    AdminUpdateHotelInput,
    HotelIdParamInput,
    HotelListQueryInput,
} from '../validations/hotel.validation.js';

function extractFilePaths(req: Request): string[] {
    const files = req.files as Express.Multer.File[] | undefined;
    return files ? files.map((file) => file.path) : [];
}

class HotelController {
    createHotel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const body = req.body as CreateHotelInput;
        const hotel = await hotelService.createHotel(req.user.id, body, extractFilePaths(req));
        res.status(201).json({ success: true, hotel });
    });

    getHotelById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as HotelIdParamInput;
        const hotel = await hotelService.getHotelById(id);
        res.status(200).json({ success: true, hotel });
    });

    getAllHotels = catchAsync(async (req: Request, res: Response) => {
        const query = req.validatedQuery as unknown as HotelListQueryInput;
        const result = await hotelService.getAllHotels(query);
        res.status(200).json({ success: true, ...result });
    });

    updateHotel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as HotelIdParamInput;

        if (req.user.role === UserRole.ADMIN) {
            const body = req.body as AdminUpdateHotelInput;
            const hotel = await hotelService.adminUpdateHotel(id, body, extractFilePaths(req));
            res.status(200).json({ success: true, hotel });
            return;
        }

        const body = req.body as UpdateHotelInput;
        const hotel = await hotelService.updateHotel(id, req.user.id, body, extractFilePaths(req));
        res.status(200).json({ success: true, hotel });
    });

    deleteHotel = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as HotelIdParamInput;
        await hotelService.deleteHotel(id, req.user);
        res.status(200).json({ success: true, message: 'Hotel deleted successfully' });
    });
}

const hotelController = new HotelController();

export default hotelController;