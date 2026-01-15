import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateSupplierDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  note?: string;
}

interface UpdateSupplierDto {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  note?: string;
}

export const SuppliersService = {
  // 1. Lấy danh sách (Chưa bị xóa)
  getAllSuppliers: async () => {
    return prisma.supplier.findMany({
      where: { 
        deletedAt: null // Logic Soft Delete chuẩn
      }, 
      orderBy: { createdAt: 'desc' }
    });
  },

  // 2. Lấy chi tiết
  getSupplierById: async (id: string) => { // ID là string
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    
    // Check nếu không có hoặc đã bị xóa
    if (!supplier || supplier.deletedAt) {
      throw new Error('Supplier not found');
    }
    return supplier;
  },

  // 3. Tạo mới
  createSupplier: async (data: CreateSupplierDto) => {
    // Check trùng phone
    const existingPhone = await prisma.supplier.findFirst({
      where: { 
        phone: data.phone,
        deletedAt: null // Chỉ check trùng với những người đang hoạt động
      }
    });
    if (existingPhone) {
      throw new Error('Supplier with this phone number already exists.');
    }

    // Check trùng email
    if (data.email) {
      const existingEmail = await prisma.supplier.findFirst({
        where: { email: data.email, deletedAt: null }
      });
      if (existingEmail) {
        throw new Error('Supplier with this email already exists.');
      }
    }

    return prisma.supplier.create({
      data: {
        ...data,
        // Không cần isActive, mặc định deletedAt là null
      }
    });
  },

  // 4. Cập nhật
  updateSupplier: async (id: string, data: UpdateSupplierDto) => {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier || supplier.deletedAt) throw new Error('Supplier not found');

    if (data.phone && data.phone !== supplier.phone) {
      const duplicate = await prisma.supplier.findFirst({ 
        where: { phone: data.phone, deletedAt: null } 
      });
      if (duplicate) throw new Error('Phone number is already taken.');
    }

    return prisma.supplier.update({
      where: { id },
      data
    });
  },

  // 5. Xóa (Soft Delete bằng deletedAt)
  deleteSupplier: async (id: string) => {
    // Logic: Cập nhật deletedAt thành thời gian hiện tại
    return prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
};