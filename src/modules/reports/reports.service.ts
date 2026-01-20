import prisma from '../../db/prisma'; // Import instance Prisma dùng chung
import { Prisma } from '@prisma/client';

interface ReportParams {
  storeId?: number; // Nếu Admin xem thì có thể null (xem tất cả), Manager thì bắt buộc
  startDate?: Date;
  endDate?: Date;
}

export const ReportsService = {
  // 1. Lấy tổng quan (Dashboard Summary Cards)
  getDashboardStats: async ({ storeId, startDate, endDate }: ReportParams) => {
    // Xây dựng điều kiện lọc
    const whereCondition: any = {
      status: 'COMPLETED', // Chỉ tính đơn hàng đã hoàn thành
      deleted_at: null,    // Bỏ qua đơn đã xóa (nếu có logic xóa mềm)
    };

    if (storeId) whereCondition.store_id = storeId;
    if (startDate && endDate) {
      whereCondition.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Query 1: Tổng doanh thu
    const revenueAgg = await prisma.pos_sales.aggregate({
      _sum: { total_amount: true },
      _count: { id: true }, // Đếm tổng số đơn
      where: whereCondition,
    });

    // Query 2: Đếm số khách hàng mới (giả sử có bảng customers, nếu chưa có thì tạm bỏ qua)
    // Query 3: Cảnh báo tồn kho thấp (Low Stock)
    const lowStockCount = await prisma.inventory_levels.count({
      where: {
        ...(storeId ? { store_id: storeId } : {}),
        quantity: { lt: 10 } // Giả sử dưới 10 là thấp. Thực tế nên lấy cột min_stock_level
      }
    });

    return {
      totalRevenue: revenueAgg._sum.total_amount || 0,
      totalOrders: revenueAgg._count.id || 0,
      lowStockAlerts: lowStockCount,
    };
  },

  // 2. Biểu đồ doanh thu theo thời gian (Line Chart)
  getRevenueChart: async ({ storeId, startDate, endDate }: ReportParams) => {
    // Prisma chưa hỗ trợ group by date native mạnh mẽ, ta sẽ lấy raw data rồi xử lý JS
    // Hoặc dùng $queryRaw nếu muốn tối ưu SQL. Ở đây dùng cách JS cho an toàn type.
    
    const whereCondition: any = {
      status: 'COMPLETED',
    };
    if (storeId) whereCondition.store_id = storeId;
    if (startDate && endDate) {
      whereCondition.created_at = { gte: startDate, lte: endDate };
    }

    const sales = await prisma.pos_sales.findMany({
      where: whereCondition,
      select: { created_at: true, total_amount: true },
      orderBy: { created_at: 'asc' }
    });

    // Group by Date (YYYY-MM-DD)
    const chartData: Record<string, number> = {};
    
    sales.forEach(sale => {
      // created_at có thể null trong DB cũ, cần check
      if (!sale.created_at) return;
      
      const dateKey = sale.created_at.toISOString().split('T')[0]; // Lấy ngày
      chartData[dateKey] = (chartData[dateKey] || 0) + Number(sale.total_amount);
    });

    // Chuyển về mảng cho Frontend dễ map
    return Object.entries(chartData).map(([date, revenue]) => ({ date, revenue }));
  },

  // 3. Top sản phẩm bán chạy (Pie/Bar Chart)
  getTopSellingProducts: async ({ storeId, startDate, endDate }: ReportParams) => {
    // Logic: Join pos_sales để lọc theo ngày/store -> lấy pos_line_items -> group by product
    
    // Vì Prisma group by hơi hạn chế khi join, ta làm 2 bước hoặc dùng raw query.
    // Cách đơn giản nhất: Lấy line items của các đơn hàng thỏa mãn.
    
    const whereSales: any = { status: 'COMPLETED' };
    if (storeId) whereSales.store_id = storeId;
    if (startDate && endDate) whereSales.created_at = { gte: startDate, lte: endDate };

    // Lấy Top 5 sản phẩm
    // Lưu ý: Đây là cách JS processing (Dễ hiểu nhưng chậm nếu data lớn).
    // Nếu data lớn, bạn nên dùng `prisma.$queryRaw`.
    const lineItems = await prisma.pos_line_items.findMany({
      where: {
        pos_sales: whereSales // Quan hệ ngược từ line_item -> sale
      },
      include: {
        products: true // Include để lấy tên sản phẩm
      }
    });

    const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};

    lineItems.forEach(item => {
        if(!item.product_id) return;
        const pid = item.product_id;
        
        if (!productStats[pid]) {
            productStats[pid] = { 
                name: item.product_name || item.products?.name || 'Unknown', 
                quantity: 0, 
                revenue: 0 
            };
        }
        productStats[pid].quantity += item.quantity;
        productStats[pid].revenue += Number(item.subtotal);
    });

    // Sắp xếp và lấy top 5
    const sorted = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity) // Sắp theo số lượng bán
        .slice(0, 5);

    return sorted;
  }
};