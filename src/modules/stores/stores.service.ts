import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Interface DTO
interface CreateStoreDto {
  name: string;
  code: string;
  timezone?: string;
  address?: string;
  phone?: string;
}

interface UpdateStoreDto {
  name?: string;
  code?: string;
  timezone?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

// Định nghĩa kiểu dữ liệu trả về từ Prisma khi có include _count
// Giúp TypeScript hiểu cấu trúc của dependencies mà không cần dùng 'any'
type StoreWithDependencies = Prisma.StoreGetPayload<{
  include: {
    _count: {
      select: {
        users: true;
        inventoryLevels: true;
        posSales: true;
      };
    };
  };
}>;

export const StoreService = {
  // Lấy tất cả
  getAllStores: async () => {
    return prisma.store.findMany({
      orderBy: { createdAt: 'desc' }, // Sắp xếp theo ngày tạo
    });
  },

  // Lấy 1 store (ID là string)
  getStoreById: async (id: string) => { 
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            users: true, 
            inventoryLevels: true 
          }
        }
      }
    });
    if (!store) throw new Error('Store not found');
    return store;
  },

  // Tạo mới
  createStore: async (data: CreateStoreDto) => {
    // Validate Code
    const existingCode = await prisma.store.findUnique({
      where: { code: data.code }
    });

    if (existingCode) {
      throw new Error(`Store code "${data.code}" already exists.`);
    }

    // Validate Timezone
    const timezone = data.timezone || 'Asia/Ho_Chi_Minh';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (e) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    return prisma.store.create({
      data: {
        ...data,
        timezone,
        isActive: true
      },
    });
  },

  // Cập nhật (ID là string)
  updateStore: async (id: string, data: UpdateStoreDto) => {
    const store = await prisma.store.findUnique({ where: { id } });
    if (!store) throw new Error('Store not found');

    if (data.code && data.code !== store.code) {
      const duplicate = await prisma.store.findUnique({
        where: { code: data.code }
      });
      if (duplicate) {
        throw new Error(`Store code "${data.code}" is already taken by another store.`);
      }
    }

    return prisma.store.update({
      where: { id },
      data,
    });
  },

  // Xóa (ID là string)
  deleteStore: async (id: string) => {
    // Dùng Type đã định nghĩa ở trên để ép kiểu an toàn
    const dependencies = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: { 
            users: true, 
            inventoryLevels: true,
            posSales: true
          }
        }
      }
    }) as StoreWithDependencies | null; // <--- KHẮC PHỤC LỖI ANY TẠI ĐÂY

    if (!dependencies) throw new Error('Store not found');

    // Bây giờ TypeScript đã hiểu cấu trúc bên trong, không báo lỗi nữa
    const { users, inventoryLevels, posSales } = dependencies._count;

    if (users > 0) {
      throw new Error(`Cannot delete store. It has ${users} assigned users.`);
    }
    if (inventoryLevels > 0) {
      throw new Error(`Cannot delete store. It contains inventory records.`);
    }
    if (posSales > 0) {
      throw new Error(`Cannot delete store. It has historical sales data.`);
    }

    return prisma.store.delete({
      where: { id },
    });
  }
};