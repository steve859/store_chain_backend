import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StorePromotionParams extends StoreParams {
  promotionId: string;
}

/**
 * UC-M6 — Store Promotions Management
 * Description: Create store-specific promotions
 * Edge Cases: Resolving conflicts between overlapping promotions
 */

// GET /api/v1/stores/:storeId/promotions - List promotions for store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { status, type } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      status: status || undefined,
      type: type || undefined
    }
  });
});

// GET /api/v1/stores/:storeId/promotions/:promotionId - Get specific promotion
router.get('/:promotionId', (req: Request<StorePromotionParams>, res: Response) => {
  const { storeId, promotionId } = req.params;

  res.json({
    id: parseInt(promotionId, 10),
    storeId: parseInt(storeId, 10),
    name: 'Promotion Name',
    type: 'discount',
    status: 'active',
    startDate: null,
    endDate: null,
    rules: [],
    products: []
  });
});

// POST /api/v1/stores/:storeId/promotions - Create promotion
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { name, type, discountPercent, discountAmount, startDate, endDate, products, rules, priority } = req.body;

  // Validation
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Promotion name is required' });
  }

  if (!type || !['discount', 'buy_x_get_y', 'bundle', 'coupon'].includes(type)) {
    return res.status(400).json({ error: 'Valid promotion type is required' });
  }

  if (type === 'discount' && !discountPercent && !discountAmount) {
    return res.status(400).json({ error: 'Discount percent or amount is required for discount type' });
  }

  // Check for conflicts (in real implementation, would check DB)
  const conflicts: { promotionId: number; name: string; reason: string }[] = [];

  res.status(201).json({
    message: 'Promotion created successfully',
    promotion: {
      id: 1,
      storeId: parseInt(storeId, 10),
      name,
      type,
      discountPercent: discountPercent || null,
      discountAmount: discountAmount || null,
      startDate: startDate || null,
      endDate: endDate || null,
      products: products || [],
      rules: rules || [],
      priority: priority || 0,
      status: 'draft'
    },
    conflicts,
    audit: {
      action: 'CREATE_PROMOTION',
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/v1/stores/:storeId/promotions/:promotionId - Update promotion
router.put('/:promotionId', (req: Request<StorePromotionParams>, res: Response) => {
  const { storeId, promotionId } = req.params;
  const { name, status, priority } = req.body;

  // Check for conflicts when updating
  const conflicts: { promotionId: number; name: string; reason: string }[] = [];

  res.json({
    message: 'Promotion updated successfully',
    promotion: {
      id: parseInt(promotionId, 10),
      storeId: parseInt(storeId, 10),
      name: name || 'Promotion Name',
      status: status || 'draft',
      priority: priority || 0
    },
    conflicts,
    audit: {
      action: 'UPDATE_PROMOTION',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/promotions/:promotionId/activate - Activate promotion
router.post('/:promotionId/activate', (req: Request<StorePromotionParams>, res: Response) => {
  const { storeId, promotionId } = req.params;

  // Check for conflicts before activation
  const conflicts: { promotionId: number; name: string; reason: string }[] = [];
  
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: 'Cannot activate promotion due to conflicts',
      conflicts
    });
  }

  res.json({
    message: 'Promotion activated successfully',
    promotion: {
      id: parseInt(promotionId, 10),
      storeId: parseInt(storeId, 10),
      status: 'active',
      activatedAt: new Date().toISOString()
    },
    audit: {
      action: 'ACTIVATE_PROMOTION',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/promotions/:promotionId/deactivate - Deactivate promotion
router.post('/:promotionId/deactivate', (req: Request<StorePromotionParams>, res: Response) => {
  const { storeId, promotionId } = req.params;

  res.json({
    message: 'Promotion deactivated',
    promotion: {
      id: parseInt(promotionId, 10),
      storeId: parseInt(storeId, 10),
      status: 'inactive',
      deactivatedAt: new Date().toISOString()
    },
    audit: {
      action: 'DEACTIVATE_PROMOTION',
      timestamp: new Date().toISOString()
    }
  });
});

// DELETE /api/v1/stores/:storeId/promotions/:promotionId - Delete promotion
router.delete('/:promotionId', (req: Request<StorePromotionParams>, res: Response) => {
  const { storeId, promotionId } = req.params;

  res.json({
    message: 'Promotion deleted',
    promotionId: parseInt(promotionId, 10),
    storeId: parseInt(storeId, 10),
    audit: {
      action: 'DELETE_PROMOTION',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
