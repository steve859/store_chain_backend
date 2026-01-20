import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma'; // Import từ file vừa tạo ở Bước 1

interface CreateSupplierDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  note?: string;
}

interface UpdateSupplierDto extends Partial<CreateSupplierDto> {}

interface GetSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const SuppliersService = {
  // 1. Lấy danh sách
  getAllSuppliers: async ({ page = 1, limit = 10, search }: GetSuppliersParams) => {
    const skip = (page - 1) * limit;

    // SỬA: Khai báo điều kiện where dạng object thường, không cần ép kiểu Prisma.suppliersWhereInput
    const whereCondition: Prisma.suppliersWhereInput = {
      deleted_at: null,
    };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { contact_name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where: whereCondition }),
      prisma.supplier.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      data: suppliers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // ... (Các hàm getSupplierById, create, update giữ nguyên logic cũ) ...

  getSupplierById: async (id: string) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id, deletedAt: null }
    });
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  },

  createSupplier: async (data: CreateSupplierDto) => {
    const existingPhone = await prisma.supplier.findFirst({
      where: { phone: data.phone, deletedAt: null }
    });
    if (existingPhone) throw new Error('Supplier with this phone number already exists.');

    if (data.email) {
      const existingEmail = await prisma.supplier.findFirst({
        where: { email: data.email, deletedAt: null }
      });
      if (existingEmail) throw new Error('Supplier with this email already exists.');
    }

    return prisma.supplier.create({ data });
  },

  updateSupplier: async (id: string, data: UpdateSupplierDto) => {
    const supplier = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new Error('Supplier not found');

    if (data.phone && data.phone !== supplier.phone) {
      const duplicate = await prisma.supplier.findFirst({ 
        where: { phone: data.phone, deletedAt: null, id: { not: id } }
      });
      if (duplicate) throw new Error('Phone number is already taken.');
    }

    return prisma.supplier.update({ where: { id }, data });
  },

  deleteSupplier: async (id: string) => {
    await SuppliersService.getSupplierById(id);
    return prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};