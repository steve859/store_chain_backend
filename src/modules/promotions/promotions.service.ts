import { PrismaClient, Prisma, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

// DTO Input
interface CreatePromotionDto {
  code: string;
  name: string;
  description?: string;
  type: DiscountType; // 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number;      // Frontend gửi number, DB lưu Decimal
  startDate: string | Date;
  endDate: string | Date;
  minOrderValue?: number;
  maxDiscount?: number;
}

interface UpdatePromotionDto {
  code?: string;
  name?: string;
  description?: string;
  type?: DiscountType;
  value?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  minOrderValue?: number;
  maxDiscount?: number;
  isActive?: boolean;
}

export const PromotionService = {
  // 1. Lấy danh sách
  getAllPromotions: async () => {
    return prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' }
    });
  },

  // 2. Lấy chi tiết
  getPromotionById: async (id: number) => {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new Error('Promotion not found');
    return promo;
  },

  // 3. TẠO KHUYẾN MÃI (Nhiều logic validate)
  createPromotion: async (data: CreatePromotionDto) => {
    // A. Validate Code trùng
    const existingCode = await prisma.promotion.findUnique({
      where: { code: data.code }
    });
    if (existingCode) throw new Error('Promotion code already exists.');

    // B. Validate Ngày tháng
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (start >= end) {
      throw new Error('Start date must be before end date.');
    }

    // C. Validate Giá trị hợp lệ
    if (data.value <= 0) {
      throw new Error('Discount value must be greater than 0.');
    }
    if (data.type === 'PERCENTAGE' && data.value > 100) {
      throw new Error('Percentage discount cannot exceed 100%.');
    }

    return prisma.promotion.create({
      data: {
        ...data,
        startDate: start,
        endDate: end,
        isActive: true
      }
    });
  },

  // 4. CẬP NHẬT
  updatePromotion: async (id: number, data: UpdatePromotionDto) => {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new Error('Promotion not found');

    // Nếu sửa code, phải check trùng
    if (data.code && data.code !== promo.code) {
      const duplicate = await prisma.promotion.findUnique({
        where: { code: data.code }
      });
      if (duplicate) throw new Error('Promotion code already exists.');
    }

    // Nếu sửa ngày, phải check logic ngày
    const start = data.startDate ? new Date(data.startDate) : promo.startDate;
    const end = data.endDate ? new Date(data.endDate) : promo.endDate;

    if (start >= end) {
      throw new Error('Start date must be before end date.');
    }

    return prisma.promotion.update({
      where: { id },
      data: {
        ...data,
        startDate: start,
        endDate: end
      }
    });
  },

  // 5. XÓA (Check xem đã dùng chưa - Tạm thời cho xóa hoặc Soft Delete tùy bạn)
  // Ở đây tôi làm xóa cứng cho đơn giản, sau này có bảng 'Order' thì check ràng buộc sau
  deletePromotion: async (id: number) => {
    return prisma.promotion.delete({
      where: { id }
    });
  },

  // 6. Helper: Kiểm tra mã có hợp lệ không (Dùng cho máy POS sau này)
  validateCode: async (code: string, orderTotal: number) => {
    const promo = await prisma.promotion.findUnique({ where: { code } });
    
    if (!promo) throw new Error('Invalid coupon code.');
    if (!promo.isActive) throw new Error('This promotion is inactive.');
    
    const now = new Date();
    if (now < promo.startDate || now > promo.endDate) {
      throw new Error('This promotion is expired or not yet started.');
    }

    // Check giá trị đơn hàng tối thiểu (nếu có cấu hình)
    if (promo.minOrderValue && new Prisma.Decimal(orderTotal).lessThan(promo.minOrderValue)) {
      throw new Error(`Order value must be at least ${promo.minOrderValue}`);
    }

    return promo;
  }
};