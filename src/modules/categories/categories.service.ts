import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// DTO
interface CreateCategoryDto {
  name: string;
  description?: string;
}

interface UpdateCategoryDto {
  name?: string;
  description?: string;
}

/**
 * Tạo Danh mục mới
 */
export const createCategory = async (data: CreateCategoryDto, adminId: string) => {
  const newCategory = await prisma.$transaction(async (tx) => {
    // 1. Tạo Category
    const category = await tx.category.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });

    // 2. Ghi Audit Log
    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_CATEGORY',
        entity: 'Category',
        entityId: category.id,
        detail: data as unknown as Prisma.InputJsonValue,
      },
    });

    return category;
  });

  return newCategory;
};

/**
 * Lấy danh sách Danh mục
 */
export const getAllCategories = async () => {
  // Categories thường ít, load hết không cần phân trang quá gắt gao
  // Kèm theo số lượng sản phẩm đang thuộc danh mục này
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true }, // Đếm số sản phẩm
      },
    },
  });

  return categories;
};

/**
 * Lấy chi tiết
 */
export const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) throw new Error('Category not found');
  return category;
};

/**
 * Update Danh mục
 */
export const updateCategory = async (id: string, data: UpdateCategoryDto, adminId: string) => {
  const updatedCategory = await prisma.$transaction(async (tx) => {
    const category = await tx.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_CATEGORY',
        entity: 'Category',
        entityId: category.id,
        detail: data as unknown as Prisma.InputJsonValue,
      },
    });

    return category;
  });

  return updatedCategory;
};

/**
 * Xóa Danh mục
 */
export const deleteCategory = async (id: string, adminId: string) => {
  // 1. Kiểm tra ràng buộc: Có sản phẩm nào đang dùng danh mục này không?
  const categoryCheck = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } }
    }
  });

  if (!categoryCheck) throw new Error('Category not found');

  if (categoryCheck._count.products > 0) {
    throw new Error(`Cannot delete category. It contains ${categoryCheck._count.products} products.`);
  }

  // 2. Xóa
  await prisma.$transaction(async (tx) => {
    await tx.category.delete({
      where: { id },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_CATEGORY',
        entity: 'Category',
        entityId: id,
      },
    });
  });

  return { message: 'Category deleted successfully' };
};