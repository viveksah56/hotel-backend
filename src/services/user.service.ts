import { prisma } from '../config/db.connect.js';
import { ApiError } from '../utils/api.error.js';
import { paginateQuery } from '../helper/pagination.js';
import type { PaginationParams, PaginatedResult } from '../helper/pagination.js';
import type { User } from '../../generated/prisma/client.js';
import { uploadImage, deleteImage, extractPublicId } from '../services/cloudinary.service.js';


type PublicUser = Omit<User, 'password' | 'refreshTokens'>;

interface UpdateUserData {
  name?: string;
  phone?: string;
}

interface AdminUpdateUserData {
  name?: string;
  phone?: string;
  email?: string;
  role?: string;
  isVerified?: boolean;
  isDeleted?: boolean;
}

const USER_SORT_FIELDS = ['createdAt', 'name', 'email'] as const;
const AVATAR_FOLDER = 'ghumnepal/avatars';

function toPublicUser(user: User): PublicUser {
  const { password, ...rest } = user;
  return rest;
}

class UserService {
  async getUserById(id: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    return toPublicUser(user);
  }

  async getAllUsers(params: PaginationParams): Promise<PaginatedResult<PublicUser>> {
    const result = await paginateQuery<User>(
        params,
        USER_SORT_FIELDS,
        (args) => prisma.user.findMany({ ...args, where: { isDeleted: false } }),
        () => prisma.user.count({ where: { isDeleted: false } }),
    );

    return {
      data: result.data.map(toPublicUser),
      meta: result.meta,
    };
  }

  async updateUser(id: string, data: UpdateUserData, avatarLocalPath?: string): Promise<PublicUser> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError('User not found', 404);
    }

    let avatarUrl: string | undefined;

    if (avatarLocalPath) {
      const uploaded = await uploadImage(avatarLocalPath, AVATAR_FOLDER);
      avatarUrl = uploaded.url;

      if (existing.avatar) {
        const oldPublicId = extractPublicId(existing.avatar);
        if (oldPublicId) {
          await deleteImage(oldPublicId).catch((error) => {
            console.error('failed to delete old avatar', oldPublicId, error);
          });
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        ...(avatarUrl && { avatar: avatarUrl }),
      },
    });

    return toPublicUser(updated);
  }

  async adminUpdateUser(id: string, data: AdminUpdateUserData): Promise<PublicUser> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError('User not found', 404);
    }

    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (emailTaken) {
        throw new ApiError('Email is already in use', 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    return toPublicUser(updated);
  }

  async deleteUser(id: string): Promise<void> {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      throw new ApiError('User not found', 404);
    }

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}

const userService = new UserService();

export default userService;