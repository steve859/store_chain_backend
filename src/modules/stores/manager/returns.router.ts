import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StoreReturnParams extends StoreParams {
  returnId: string;
}

/**
 * UC-M7 — Returns & Refund Management
 * Flow: Manager creates return record → Refund cash/card → Restock (optional) → Stock movement log
 * Edge Cases:
 * - Window time (return period)
 * - High-value refund needs approval
 */

// Configurable settings
const RETURN_WINDOW_DAYS = 30;
const HIGH_VALUE_THRESHOLD_CENTS = 100000; // $1000

// GET /api/v1/stores/:storeId/returns - List returns for store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { status, from, to } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      status: status || undefined,
      from: from || undefined,
      to: to || undefined
    }
  });
});

// GET /api/v1/stores/:storeId/returns/:returnId - Get specific return
router.get('/:returnId', (req: Request<StoreReturnParams>, res: Response) => {
  const { storeId, returnId } = req.params;

  res.json({
    id: parseInt(returnId, 10),
    storeId: parseInt(storeId, 10),
    saleId: null,
    status: 'pending',
    refundAmountCents: 0,
    refundMethod: null,
    items: [],
    restocked: false,
    createdAt: new Date().toISOString()
  });
});

// POST /api/v1/stores/:storeId/returns - Create return record
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { saleId, items, reason, refundMethod, restock } = req.body;

  // Validation
  if (!saleId || typeof saleId !== 'number') {
    return res.status(400).json({ error: 'Sale ID is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required for return' });
  }

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Return reason is required' });
  }

  if (!refundMethod || !['cash', 'card', 'store_credit'].includes(refundMethod)) {
    return res.status(400).json({ error: 'Valid refund method is required (cash, card, store_credit)' });
  }

  // Calculate refund amount (stub)
  const refundAmountCents = items.reduce((acc: number, item: { quantity: number; priceCents?: number }) => 
    acc + (item.priceCents || 0) * item.quantity, 0);

  // Check return window (stub - would check sale date)
  const saleDateStub = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const daysSinceSale = Math.floor((Date.now() - saleDateStub.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceSale > RETURN_WINDOW_DAYS) {
    return res.status(400).json({ 
      error: `Return window expired. Returns must be within ${RETURN_WINDOW_DAYS} days of purchase.`,
      daysSinceSale,
      returnWindowDays: RETURN_WINDOW_DAYS
    });
  }

  // Check if high-value refund needs approval
  const needsApproval = refundAmountCents > HIGH_VALUE_THRESHOLD_CENTS;
  const status = needsApproval ? 'pending_approval' : 'approved';

  res.status(201).json({
    message: needsApproval 
      ? 'Return created - awaiting approval due to high value' 
      : 'Return created successfully',
    return: {
      id: 1,
      storeId: parseInt(storeId, 10),
      saleId,
      status,
      reason,
      refundAmountCents,
      refundMethod,
      items: items.map((item: { productId: number; quantity: number; priceCents?: number }, index: number) => ({
        id: index + 1,
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents || 0
      })),
      restock: restock !== false,
      needsApproval,
      createdAt: new Date().toISOString()
    },
    stockMovement: restock !== false ? {
      txType: 'RETURN',
      items: items.length,
      logged: true
    } : null,
    audit: {
      action: 'CREATE_RETURN',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/returns/:returnId/approve - Approve high-value return
router.post('/:returnId/approve', (req: Request<StoreReturnParams>, res: Response) => {
  const { storeId, returnId } = req.params;
  const { approvedBy, notes } = req.body;

  if (!approvedBy || typeof approvedBy !== 'number') {
    return res.status(400).json({ error: 'Approver ID is required' });
  }

  res.json({
    message: 'Return approved',
    return: {
      id: parseInt(returnId, 10),
      storeId: parseInt(storeId, 10),
      status: 'approved',
      approvedBy,
      approvedAt: new Date().toISOString(),
      notes: notes || null
    },
    audit: {
      action: 'APPROVE_RETURN',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/returns/:returnId/reject - Reject return
router.post('/:returnId/reject', (req: Request<StoreReturnParams>, res: Response) => {
  const { storeId, returnId } = req.params;
  const { rejectedBy, reason } = req.body;

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  res.json({
    message: 'Return rejected',
    return: {
      id: parseInt(returnId, 10),
      storeId: parseInt(storeId, 10),
      status: 'rejected',
      rejectedBy: rejectedBy || null,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    },
    audit: {
      action: 'REJECT_RETURN',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/returns/:returnId/process - Process refund
router.post('/:returnId/process', (req: Request<StoreReturnParams>, res: Response) => {
  const { storeId, returnId } = req.params;
  const { processedBy } = req.body;

  res.json({
    message: 'Refund processed successfully',
    return: {
      id: parseInt(returnId, 10),
      storeId: parseInt(storeId, 10),
      status: 'completed',
      processedBy: processedBy || null,
      processedAt: new Date().toISOString()
    },
    refund: {
      completed: true,
      timestamp: new Date().toISOString()
    },
    stockMovement: {
      txType: 'RETURN_RESTOCK',
      completed: true
    },
    audit: {
      action: 'PROCESS_RETURN',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
