import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Constants
const DEFAULT_REPORT_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper function to get default date range
function getDefaultDateRange() {
  return {
    from: new Date(Date.now() - DEFAULT_REPORT_DAYS * MS_PER_DAY).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  };
}

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

/**
 * UC-M4 — Store Reports
 * Description: Revenue, best-sellers, low-stock alerts
 * Edge Cases: Export CSV/PDF
 */

// GET /api/v1/stores/:storeId/reports - List available reports
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;

  res.json({
    storeId: parseInt(storeId, 10),
    availableReports: [
      { type: 'revenue', description: 'Revenue report by date range' },
      { type: 'best-sellers', description: 'Top selling products' },
      { type: 'low-stock', description: 'Products with low stock alerts' },
      { type: 'inventory-valuation', description: 'Current inventory value' },
      { type: 'sales-by-category', description: 'Sales breakdown by category' }
    ]
  });
});

// GET /api/v1/stores/:storeId/reports/revenue - Revenue report
router.get('/revenue', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { from, to, format } = req.query;
  const defaultRange = getDefaultDateRange();

  const report = {
    storeId: parseInt(storeId, 10),
    reportType: 'revenue',
    period: {
      from: from || defaultRange.from,
      to: to || defaultRange.to
    },
    data: {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      dailyBreakdown: []
    },
    generatedAt: new Date().toISOString()
  };

  // Handle export format
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=revenue-report-${storeId}.csv`);
    return res.send('date,revenue,orders\n');
  }

  if (format === 'pdf') {
    return res.json({
      ...report,
      downloadUrl: `/api/v1/stores/${storeId}/reports/revenue/download?format=pdf&from=${from}&to=${to}`
    });
  }

  res.json(report);
});

// GET /api/v1/stores/:storeId/reports/best-sellers - Best sellers report
router.get('/best-sellers', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { from, to, limit, format } = req.query;
  const defaultRange = getDefaultDateRange();

  const report = {
    storeId: parseInt(storeId, 10),
    reportType: 'best-sellers',
    period: {
      from: from || defaultRange.from,
      to: to || defaultRange.to
    },
    limit: parseInt(limit as string, 10) || 10,
    data: {
      products: []
    },
    generatedAt: new Date().toISOString()
  };

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=best-sellers-${storeId}.csv`);
    return res.send('rank,product_name,sku,quantity_sold,revenue\n');
  }

  res.json(report);
});

// GET /api/v1/stores/:storeId/reports/low-stock - Low stock alerts
router.get('/low-stock', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { threshold, format } = req.query;

  const report = {
    storeId: parseInt(storeId, 10),
    reportType: 'low-stock',
    threshold: parseInt(threshold as string, 10) || 10,
    data: {
      totalAlerts: 0,
      products: []
    },
    generatedAt: new Date().toISOString()
  };

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=low-stock-${storeId}.csv`);
    return res.send('product_name,sku,current_quantity,threshold,status\n');
  }

  res.json(report);
});

// GET /api/v1/stores/:storeId/reports/inventory-valuation - Inventory valuation
router.get('/inventory-valuation', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { format } = req.query;

  const report = {
    storeId: parseInt(storeId, 10),
    reportType: 'inventory-valuation',
    data: {
      totalValue: 0,
      totalCost: 0,
      totalItems: 0,
      categories: []
    },
    generatedAt: new Date().toISOString()
  };

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-valuation-${storeId}.csv`);
    return res.send('product_name,sku,quantity,unit_cost,total_value\n');
  }

  res.json(report);
});

// GET /api/v1/stores/:storeId/reports/sales-by-category - Sales by category
router.get('/sales-by-category', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { from, to, format } = req.query;
  const defaultRange = getDefaultDateRange();

  const report = {
    storeId: parseInt(storeId, 10),
    reportType: 'sales-by-category',
    period: {
      from: from || defaultRange.from,
      to: to || defaultRange.to
    },
    data: {
      categories: []
    },
    generatedAt: new Date().toISOString()
  };

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sales-by-category-${storeId}.csv`);
    return res.send('category,quantity_sold,revenue,percentage\n');
  }

  res.json(report);
});

export default router;
