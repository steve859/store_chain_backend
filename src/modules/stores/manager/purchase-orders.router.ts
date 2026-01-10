import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Constants
const NUMBER_PADDING = 6;

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StorePOParams extends StoreParams {
  poId: string;
}

/**
 * UC-M2 & UC-M3 — Purchase Order Management
 * Flow: Create PO → Send email → Receive goods → Store cost
 * Edge Cases: PO locked after received
 */

// GET /api/v1/stores/:storeId/purchase-orders - List purchase orders for a store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { status, supplierId } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      status: status || undefined,
      supplierId: supplierId ? parseInt(supplierId as string, 10) : undefined
    }
  });
});

// GET /api/v1/stores/:storeId/purchase-orders/:poId - Get specific purchase order
router.get('/:poId', (req: Request<StorePOParams>, res: Response) => {
  const { storeId, poId } = req.params;

  res.json({
    id: parseInt(poId, 10),
    poNumber: `PO-${poId.padStart(NUMBER_PADDING, '0')}`,
    storeId: parseInt(storeId, 10),
    supplierId: null,
    status: 'draft',
    totalCents: 0,
    lines: [],
    createdAt: new Date().toISOString()
  });
});

// POST /api/v1/stores/:storeId/purchase-orders - Create purchase order
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { supplierId, lines, expectedDate } = req.body;

  // Validation
  if (!supplierId || typeof supplierId !== 'number') {
    return res.status(400).json({ error: 'Supplier ID is required' });
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  // Validate each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.productId) {
      return res.status(400).json({ error: `Product ID is required for line ${i + 1}` });
    }
    if (!line.quantity || line.quantity <= 0) {
      return res.status(400).json({ error: `Valid quantity is required for line ${i + 1}` });
    }
  }

  res.status(201).json({
    message: 'Purchase order created successfully',
    purchaseOrder: {
      id: 1,
      poNumber: 'PO-000001',
      storeId: parseInt(storeId, 10),
      supplierId,
      status: 'draft',
      lines: lines.map((line: { productId: number; quantity: number; unitPrice?: number }, index: number) => ({
        id: index + 1,
        productId: line.productId,
        quantity: line.quantity,
        unitPriceCents: line.unitPrice || 0,
        receivedQuantity: 0
      })),
      expectedDate: expectedDate || null,
      totalCents: lines.reduce((acc: number, line: { unitPrice?: number; quantity: number }) => 
        acc + (line.unitPrice || 0) * line.quantity, 0),
      createdAt: new Date().toISOString()
    },
    audit: {
      action: 'CREATE_PURCHASE_ORDER',
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/v1/stores/:storeId/purchase-orders/:poId - Update purchase order
router.put('/:poId', (req: Request<StorePOParams>, res: Response) => {
  const { storeId, poId } = req.params;
  const { status } = req.body;

  // Check if PO is locked (received status)
  // In real implementation, would check DB
  const currentStatus: string = 'draft'; // stub
  
  if (currentStatus === 'received') {
    return res.status(400).json({ error: 'Cannot modify a received purchase order' });
  }

  res.json({
    message: 'Purchase order updated successfully',
    purchaseOrder: {
      id: parseInt(poId, 10),
      storeId: parseInt(storeId, 10),
      status: status || currentStatus
    },
    audit: {
      action: 'UPDATE_PURCHASE_ORDER',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/purchase-orders/:poId/send - Send PO to supplier
router.post('/:poId/send', (req: Request<StorePOParams>, res: Response) => {
  const { storeId, poId } = req.params;

  res.json({
    message: 'Purchase order sent to supplier',
    purchaseOrder: {
      id: parseInt(poId, 10),
      storeId: parseInt(storeId, 10),
      status: 'sent'
    },
    emailSent: true,
    sentAt: new Date().toISOString(),
    audit: {
      action: 'SEND_PURCHASE_ORDER',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/purchase-orders/:poId/receive - Receive goods for PO
router.post('/:poId/receive', (req: Request<StorePOParams>, res: Response) => {
  const { storeId, poId } = req.params;
  const { lines, receivedBy } = req.body;

  // Partial receive support
  const isPartial = lines && Array.isArray(lines) && lines.some(
    (line: { productId: number; receivedQuantity: number; orderedQuantity?: number }) => 
      line.receivedQuantity < (line.orderedQuantity || 0)
  );

  res.status(200).json({
    message: isPartial ? 'Partial goods received' : 'Goods received successfully',
    purchaseOrder: {
      id: parseInt(poId, 10),
      storeId: parseInt(storeId, 10),
      status: isPartial ? 'partial_received' : 'received'
    },
    grn: {
      grnNumber: `GRN-${poId.padStart(NUMBER_PADDING, '0')}`,
      receivedBy: receivedBy || null,
      receivedAt: new Date().toISOString(),
      lines: lines || []
    },
    inventoryUpdated: true,
    audit: {
      action: 'RECEIVE_PURCHASE_ORDER',
      timestamp: new Date().toISOString()
    }
  });
});

// DELETE /api/v1/stores/:storeId/purchase-orders/:poId - Cancel/Delete PO
router.delete('/:poId', (req: Request<StorePOParams>, res: Response) => {
  const { storeId, poId } = req.params;

  res.json({
    message: 'Purchase order cancelled',
    purchaseOrderId: parseInt(poId, 10),
    storeId: parseInt(storeId, 10),
    audit: {
      action: 'CANCEL_PURCHASE_ORDER',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
