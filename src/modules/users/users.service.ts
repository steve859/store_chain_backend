import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// DTO cho tạo mới
interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  roleId: string;
  storeId?: string | null;
}

// DTO cho cập nhật
// BỎ isActive khỏi đây
interface UpdateUserDto {
  email?: string;
  name?: string;
  password?: string;
  roleId?: string;
  storeId?: string | null;
}

type UserWithDetails = Prisma.UserGetPayload<{
  include: {
    role: true;
    store: true;
  };
}>;

export const UserService = {
  // 1. Lấy danh sách Users
  getAllUsers: async () => {
    return prisma.user.findMany({
      where: {
        deletedAt: null // Chỉ lấy user chưa bị xóa
      },
      include: {
        role: true,
        store: true
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  // 2. Lấy chi tiết 1 User
  getUserById: async (id: string) => {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        store: true
      }
    });

    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }
    
    const { passwordHash, ...result } = user;
    return result;
  },

  // 3. TẠO USER MỚI
  createUser: async (data: CreateUserDto) => {
    // A. Validate Email
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new Error('Email is already in use.');
    }

    // B. Validate Role
    const roleExists = await prisma.role.findUnique({
      where: { id: data.roleId }
    });
    if (!roleExists) {
      throw new Error('Role not found.');
    }

    // C. Validate Store
    if (data.storeId) {
      const storeExists = await prisma.store.findUnique({
        where: { id: data.storeId }
      });
      if (!storeExists) {
        throw new Error('Store not found.');
      }
    }

    // D. Hash Password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // E. Tạo User
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: hashedPassword,
        roleId: data.roleId,
        storeId: data.storeId,
        // SỬA LỖI: Bỏ dòng isActive: true
      },
      include: {
        role: true,
        store: true
      }
      // Note: Prisma tự động trả về object, ta sẽ filter password ở Controller hoặc Interceptor
      // Ở đây tạm thời return nguyên object, Controller sẽ lo việc ẩn password nếu cần kỹ hơn
      // Hoặc xử lý thủ công bên dưới:
    }).then(user => {
        const { passwordHash, ...result } = user;
        return result;
    });
  },

  // 4. CẬP NHẬT USER
  updateUser: async (id: string, data: UpdateUserDto) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new Error('User not found');

    if (data.email && data.email !== user.email) {
      const duplicate = await prisma.user.findUnique({
        where: { email: data.email }
      });
      if (duplicate) throw new Error('Email is already taken.');
    }

    let updatedPasswordHash = user.passwordHash;
    if (data.password) {
      updatedPasswordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        name: data.name,
        roleId: data.roleId,
        storeId: data.storeId,
        passwordHash: updatedPasswordHash
        // SỬA LỖI: Bỏ isActive khỏi data update
      },
      include: { role: true, store: true }
    });

    const { passwordHash, ...result } = updatedUser;
    return result;
  },

  // 5. XÓA USER (SOFT DELETE)
  deleteUser: async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(), // Đánh dấu thời gian xóa
        // SỬA LỖI: Bỏ dòng isActive: false
      }
    });
  }
};