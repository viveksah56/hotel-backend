import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { ApiError } from '../utils/api.error.js';
import userService from '../services/user.service.js';
import { UserRole } from '../constants/role.constant.js';
import type {
    UpdateUserInput,
    AdminUpdateUserInput,
    UserIdParamInput,
    UserListQueryInput,
} from '../validations/user.validation.js';

class UserController {
    getUserById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as UserIdParamInput;
        const user = await userService.getUserById(id);
        res.status(200).json({ success: true, user });
    });

    getAllUsers = catchAsync(async (req: Request, res: Response) => {
        const query = req.validatedQuery as UserListQueryInput;
        const result = await userService.getAllUsers(query);
        res.status(200).json({ success: true, ...result });
    });

    updateUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            next(new ApiError('Unauthorized', 401));
            return;
        }

        const { id } = req.params as UserIdParamInput;

        if (req.user.role === UserRole.ADMIN) {
            const body = req.body as AdminUpdateUserInput;
            const user = await userService.adminUpdateUser(id, body);
            res.status(200).json({ success: true, user });
            return;
        }

        const body = req.body as UpdateUserInput;
        const user = await userService.updateUser(id, body, req.file?.path);
        res.status(200).json({ success: true, user });
    });

    deleteUser = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as UserIdParamInput;
        await userService.deleteUser(id);
        res.status(200).json({ success: true, message: 'Account deleted successfully' });
    });
}

const userController = new UserController();

export default userController;