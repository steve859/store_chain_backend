import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Constants
const NUMBER_PADDING = 6;

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StoreTransferParams extends StoreParams {
  transferId: string;
}

/**
 * UC-M8 — Store Transfers Management
 * Flow: Create request → Ship → Receive → Update inventory
 * Edge Cases:
 * - Reserve quantity when shipped
 * - Track transit
 */

// GET /api/v1/stores/:storeId/transfers - List transfers for store (both sent and received)
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { direction, status } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      direction: direction || 'all',
      status: status || undefined
    }
  });
});

// GET /api/v1/stores/:storeId/transfers/:transferId - Get specific transfer
router.get('/:transferId', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;

  res.json({
    id: parseInt(transferId, 10),
    transferNumber: `TRF-${transferId.padStart(NUMBER_PADDING, '0')}`,
    fromStoreId: null,
    toStoreId: null,
    status: 'pending',
    items: [],
    tracking: {
      createdAt: null,
      shippedAt: null,
      receivedAt: null
    },
    currentStoreRole: parseInt(storeId, 10)
  });
});

// POST /api/v1/stores/:storeId/transfers - Create transfer request (outgoing)
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { toStoreId, items, notes } = req.body;

  // Validation
  if (!toStoreId || typeof toStoreId !== 'number') {
    return res.status(400).json({ error: 'Destination store ID is required' });
  }

  if (toStoreId === parseInt(storeId, 10)) {
    return res.status(400).json({ error: 'Cannot transfer to the same store' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required for transfer' });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.productId) {
      return res.status(400).json({ error: `Product ID is required for item ${i + 1}` });
    }
    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({ error: `Valid quantity is required for item ${i + 1}` });
    }
  }

  res.status(201).json({
    message: 'Transfer request created successfully',
    transfer: {
      id: 1,
      transferNumber: 'TRF-000001',
      fromStoreId: parseInt(storeId, 10),
      toStoreId,
      status: 'pending',
      items: items.map((item: { productId: number; quantity: number }, index: number) => ({
        id: index + 1,
        productId: item.productId,
        requestedQuantity: item.quantity,
        pickedQuantity: 0,
        receivedQuantity: null
      })),
      notes: notes || null,
      createdAt: new Date().toISOString()
    },
    audit: {
      action: 'CREATE_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/transfers/:transferId/approve - Approve transfer request
router.post('/:transferId/approve', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;
  const { approvedBy } = req.body;

  res.json({
    message: 'Transfer approved',
    transfer: {
      id: parseInt(transferId, 10),
      fromStoreId: parseInt(storeId, 10),
      status: 'approved',
      approvedBy: approvedBy || null,
      approvedAt: new Date().toISOString()
    },
    audit: {
      action: 'APPROVE_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/transfers/:transferId/pick - Pick items for transfer
router.post('/:transferId/pick', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;
  const { items, pickedBy } = req.body;

  res.json({
    message: 'Items picked for transfer',
    transfer: {
      id: parseInt(transferId, 10),
      fromStoreId: parseInt(storeId, 10),
      status: 'picking',
      items: items || [],
      pickedBy: pickedBy || null,
      pickedAt: new Date().toISOString()
    },
    audit: {
      action: 'PICK_TRANSFER_ITEMS',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/transfers/:transferId/ship - Ship transfer (reserve qty)
router.post('/:transferId/ship', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;
  const { shippedBy, trackingNumber } = req.body;

  res.json({
    message: 'Transfer shipped - inventory reserved',
    transfer: {
      id: parseInt(transferId, 10),
      fromStoreId: parseInt(storeId, 10),
      status: 'in_transit',
      tracking: {
        shippedBy: shippedBy || null,
        shippedAt: new Date().toISOString(),
        trackingNumber: trackingNumber || null,
        estimatedArrival: null
      }
    },
    inventoryReserved: true,
    stockMovement: {
      txType: 'TRANSFER_OUT',
      logged: true
    },
    audit: {
      action: 'SHIP_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/transfers/:transferId/receive - Receive transfer
router.post('/:transferId/receive', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;
  const { items, receivedBy, notes } = req.body;

  // Check for discrepancies
  const hasDiscrepancies = items && Array.isArray(items) && items.some(
    (item: { productId: number; receivedQuantity: number; expectedQuantity?: number }) => 
      item.receivedQuantity !== (item.expectedQuantity || 0)
  );

  res.json({
    message: hasDiscrepancies 
      ? 'Transfer received with discrepancies' 
      : 'Transfer received successfully',
    transfer: {
      id: parseInt(transferId, 10),
      toStoreId: parseInt(storeId, 10),
      status: 'received',
      items: items || [],
      receivedBy: receivedBy || null,
      receivedAt: new Date().toISOString(),
      hasDiscrepancies,
      notes: notes || null
    },
    inventoryUpdated: true,
    stockMovement: {
      txType: 'TRANSFER_IN',
      logged: true
    },
    audit: {
      action: 'RECEIVE_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/v1/stores/:storeId/transfers/:transferId - Update transfer
router.put('/:transferId', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;
  const { notes } = req.body;

  res.json({
    message: 'Transfer updated',
    transfer: {
      id: parseInt(transferId, 10),
      fromStoreId: parseInt(storeId, 10),
      notes: notes || null
    },
    audit: {
      action: 'UPDATE_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

// DELETE /api/v1/stores/:storeId/transfers/:transferId - Cancel transfer
router.delete('/:transferId', (req: Request<StoreTransferParams>, res: Response) => {
  const { storeId, transferId } = req.params;

  res.json({
    message: 'Transfer cancelled',
    transferId: parseInt(transferId, 10),
    storeId: parseInt(storeId, 10),
    inventoryReleased: false,
    audit: {
      action: 'CANCEL_TRANSFER',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
