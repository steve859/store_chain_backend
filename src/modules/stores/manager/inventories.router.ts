import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StoreInventoryParams extends StoreParams {
  inventoryId: string;
}

/**
 * UC-M2 — Inventory Management (Stock In & Adjustment)
 * Description: Record stock receipts or inventory adjustments
 * Edge Cases:
 * - Partial receive
 * - Prevent negative stock or allow but require notes
 * - Lot/expiry tracking
 */

// GET /api/v1/stores/:storeId/inventories - List inventory records for a store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { lowStock, productId } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      lowStock: lowStock === 'true',
      productId: productId ? parseInt(productId as string, 10) : undefined
    }
  });
});

// GET /api/v1/stores/:storeId/inventories/:inventoryId - Get specific inventory record
router.get('/:inventoryId', (req: Request<StoreInventoryParams>, res: Response) => {
  const { storeId, inventoryId } = req.params;

  res.json({
    id: parseInt(inventoryId, 10),
    storeId: parseInt(storeId, 10),
    productId: 1,
    batchNo: null,
    expiryDate: null,
    quantity: 0,
    reserved: 0,
    lastReceivedAt: null
  });
});

// POST /api/v1/stores/:storeId/inventories/:inventoryId/adjust - Adjust inventory
router.post('/:inventoryId/adjust', (req: Request<StoreInventoryParams>, res: Response) => {
  const { storeId, inventoryId } = req.params;
  const { adjustmentType, quantity, reason, note, batchNo, expiryDate } = req.body;

  // Validation
  if (!adjustmentType || !['increase', 'decrease', 'set'].includes(adjustmentType)) {
    return res.status(400).json({ error: 'Valid adjustmentType is required (increase, decrease, set)' });
  }

  if (quantity === undefined || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Quantity is required and must be a number' });
  }

  if (quantity < 0 && adjustmentType !== 'set') {
    return res.status(400).json({ error: 'Quantity must be non-negative' });
  }

  res.status(200).json({
    message: 'Inventory adjusted successfully',
    inventory: {
      id: parseInt(inventoryId, 10),
      storeId: parseInt(storeId, 10),
      adjustmentType,
      previousQuantity: 0,
      newQuantity: quantity,
      reason: reason || null,
      note: note || null,
      batchNo: batchNo || null,
      expiryDate: expiryDate || null
    },
    movement: {
      txType: `ADJUSTMENT_${adjustmentType.toUpperCase()}`,
      quantity,
      createdAt: new Date().toISOString()
    },
    audit: {
      action: 'INVENTORY_ADJUST',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/inventories/receive - Receive goods (from GRN)
router.post('/receive', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { grnId, items } = req.body;

  if (!grnId) {
    return res.status(400).json({ error: 'GRN ID is required' });
  }

  res.status(201).json({
    message: 'Goods received successfully',
    storeId: parseInt(storeId, 10),
    grnId,
    itemsReceived: items?.length || 0,
    movements: [],
    audit: {
      action: 'GOODS_RECEIVED',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
