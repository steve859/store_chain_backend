import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Constants
const SMALL_REFUND_THRESHOLD_CENTS = 10000; // $100

// Define param types
interface StorePOSParams {
  storeId: string;
}

interface StoreSaleParams extends StorePOSParams {
  saleId: string;
}

interface StoreShiftParams extends StorePOSParams {
  shiftId: string;
}

/**
 * POS/Cashier Use Cases
 * All routes are scoped to /api/v1/stores/:storeId/pos
 */

// UC-C1: POS Checkout - Create a sale
router.post('/checkout', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cashierId, items, payments, customerId, promotions } = req.body;

  // Validation
  if (!cashierId || typeof cashierId !== 'number') {
    return res.status(400).json({ error: 'Cashier ID is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'At least one payment method is required' });
  }

  // Calculate totals
  const subtotal = items.reduce((acc: number, item: { quantity: number; priceCents: number }) => 
    acc + item.quantity * item.priceCents, 0);
  
  const discountCents = 0; // Would calculate from promotions
  const totalCents = subtotal - discountCents;

  res.status(201).json({
    message: 'Sale completed successfully',
    sale: {
      id: 1,
      saleNumber: 'SALE-000001',
      storeId: parseInt(storeId, 10),
      cashierId,
      customerId: customerId || null,
      items: items.map((item: { productId: number; quantity: number; priceCents: number }, index: number) => ({
        id: index + 1,
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents,
        totalCents: item.quantity * item.priceCents
      })),
      subtotalCents: subtotal,
      discountCents,
      totalCents,
      payments: payments.map((payment: { method: string; amountCents: number }) => ({
        method: payment.method,
        amountCents: payment.amountCents
      })),
      promotionsApplied: promotions || [],
      status: 'completed',
      createdAt: new Date().toISOString()
    },
    inventoryUpdated: true,
    receipt: {
      receiptNumber: 'RCP-000001',
      printable: true
    }
  });
});

// UC-C2: Hold Sale - Save current sale for later
router.post('/sales/hold', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cashierId, items, note } = req.body;

  if (!cashierId || typeof cashierId !== 'number') {
    return res.status(400).json({ error: 'Cashier ID is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required to hold sale' });
  }

  res.status(201).json({
    message: 'Sale held successfully',
    heldSale: {
      id: 1,
      storeId: parseInt(storeId, 10),
      cashierId,
      items,
      note: note || null,
      status: 'held',
      heldAt: new Date().toISOString()
    }
  });
});

// UC-C2: List Held Sales
router.get('/sales/held', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cashierId } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      cashierId: cashierId ? parseInt(cashierId as string, 10) : undefined
    }
  });
});

// UC-C2: Resume Held Sale
router.post('/sales/held/:saleId/resume', (req: Request<StoreSaleParams>, res: Response) => {
  const { storeId, saleId } = req.params;

  res.json({
    message: 'Sale resumed successfully',
    sale: {
      id: parseInt(saleId, 10),
      storeId: parseInt(storeId, 10),
      items: [],
      status: 'active'
    }
  });
});

// UC-C2: Cancel Held Sale
router.delete('/sales/held/:saleId', (req: Request<StoreSaleParams>, res: Response) => {
  const { storeId, saleId } = req.params;

  res.json({
    message: 'Held sale cancelled',
    saleId: parseInt(saleId, 10),
    storeId: parseInt(storeId, 10)
  });
});

// UC-C3: Small Refund (under threshold, no manager approval needed)
router.post('/refund', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { saleId, items, reason, cashierId } = req.body;

  if (!saleId || typeof saleId !== 'number') {
    return res.status(400).json({ error: 'Sale ID is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required for refund' });
  }

  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'Refund reason is required' });
  }

  // Calculate refund amount
  const refundAmountCents = items.reduce((acc: number, item: { quantity: number; priceCents: number }) => 
    acc + item.quantity * item.priceCents, 0);

  // Check if it's a small refund
  const isSmallRefund = refundAmountCents <= SMALL_REFUND_THRESHOLD_CENTS;

  if (!isSmallRefund) {
    return res.status(403).json({
      error: 'Refund amount exceeds cashier limit. Manager approval required.',
      refundAmountCents,
      threshold: SMALL_REFUND_THRESHOLD_CENTS,
      requiresManagerApproval: true
    });
  }

  res.status(201).json({
    message: 'Refund processed successfully',
    refund: {
      id: 1,
      storeId: parseInt(storeId, 10),
      saleId,
      cashierId: cashierId || null,
      items,
      reason,
      refundAmountCents,
      status: 'completed',
      processedAt: new Date().toISOString()
    },
    inventoryRestocked: true
  });
});

// UC-C4: Print Invoice/Receipt
router.post('/sales/:saleId/print', (req: Request<StoreSaleParams>, res: Response) => {
  const { storeId, saleId } = req.params;
  const { format } = req.body;

  res.json({
    message: 'Invoice queued for printing',
    receipt: {
      saleId: parseInt(saleId, 10),
      storeId: parseInt(storeId, 10),
      receiptNumber: `RCP-${String(saleId).padStart(6, '0')}`,
      format: format || 'thermal',
      printJob: {
        id: 1,
        status: 'queued',
        queuedAt: new Date().toISOString()
      }
    }
  });
});

// UC-C4: Get Receipt Data
router.get('/sales/:saleId/receipt', (req: Request<StoreSaleParams>, res: Response) => {
  const { storeId, saleId } = req.params;
  const { format } = req.query;

  const receiptData = {
    saleId: parseInt(saleId, 10),
    storeId: parseInt(storeId, 10),
    receiptNumber: `RCP-${String(saleId).padStart(6, '0')}`,
    storeName: 'Store Name',
    storeAddress: 'Store Address',
    date: new Date().toISOString(),
    cashier: 'Cashier Name',
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    payments: [],
    barcode: `*${saleId}*`
  };

  // Return as JSON or formatted text
  if (format === 'text') {
    const receiptText = `
========================================
        ${receiptData.storeName}
        ${receiptData.storeAddress}
========================================
Receipt: ${receiptData.receiptNumber}
Date: ${new Date(receiptData.date).toLocaleString()}
Cashier: ${receiptData.cashier}
========================================
ITEMS:
(no items)
========================================
Subtotal: $${(receiptData.subtotal / 100).toFixed(2)}
Discount: $${(receiptData.discount / 100).toFixed(2)}
----------------------------------------
TOTAL:    $${(receiptData.total / 100).toFixed(2)}
========================================
Thank you for your purchase!
========================================
    `.trim();
    
    res.setHeader('Content-Type', 'text/plain');
    return res.send(receiptText);
  }

  res.json(receiptData);
});

// UC-C5: Open Shift
router.post('/shifts/open', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cashierId, openingCash } = req.body;

  if (!cashierId || typeof cashierId !== 'number') {
    return res.status(400).json({ error: 'Cashier ID is required' });
  }

  if (openingCash === undefined || typeof openingCash !== 'number') {
    return res.status(400).json({ error: 'Opening cash amount is required' });
  }

  res.status(201).json({
    message: 'Shift opened successfully',
    shift: {
      id: 1,
      storeId: parseInt(storeId, 10),
      cashierId,
      openingCashCents: openingCash,
      status: 'open',
      openedAt: new Date().toISOString()
    }
  });
});

// UC-C5: Close Shift
router.post('/shifts/:shiftId/close', (req: Request<StoreShiftParams>, res: Response) => {
  const { storeId, shiftId } = req.params;
  const { closingCash, notes } = req.body;

  if (closingCash === undefined || typeof closingCash !== 'number') {
    return res.status(400).json({ error: 'Closing cash amount is required for reconciliation' });
  }

  // Calculate variance (stub - would fetch from DB)
  const expectedCash = 50000; // stub
  const variance = closingCash - expectedCash;

  res.json({
    message: 'Shift closed successfully',
    shift: {
      id: parseInt(shiftId, 10),
      storeId: parseInt(storeId, 10),
      status: 'closed',
      closedAt: new Date().toISOString(),
      reconciliation: {
        openingCashCents: 10000,
        expectedCashCents: expectedCash,
        closingCashCents: closingCash,
        varianceCents: variance,
        notes: notes || null
      }
    }
  });
});

// UC-C5: Get Current Shift
router.get('/shifts/current', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cashierId } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    cashierId: cashierId ? parseInt(cashierId as string, 10) : undefined,
    shift: null
  });
});

// UC-C6: Inventory Lookup
router.get('/inventory/lookup', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { sku, barcode, productId } = req.query;

  if (!sku && !barcode && !productId) {
    return res.status(400).json({ error: 'At least one search parameter is required (sku, barcode, or productId)' });
  }

  res.json({
    storeId: parseInt(storeId, 10),
    results: [],
    searchParams: {
      sku: sku || undefined,
      barcode: barcode || undefined,
      productId: productId ? parseInt(productId as string, 10) : undefined
    }
  });
});

// UC-C6: Quick Product Search
router.get('/products/search', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  res.json({
    storeId: parseInt(storeId, 10),
    query: q,
    results: []
  });
});

// UC-C7: Apply Promotion/Loyalty to Sale
router.post('/sales/apply-promotion', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { saleId, promotionId, loyaltyCardNumber } = req.body;

  if (!saleId || (!promotionId && !loyaltyCardNumber)) {
    return res.status(400).json({ error: 'Sale ID and either promotion ID or loyalty card number is required' });
  }

  res.json({
    message: 'Promotion/loyalty applied successfully',
    sale: {
      id: saleId || 1,
      storeId: parseInt(storeId, 10),
      promotionId: promotionId || null,
      loyaltyCardNumber: loyaltyCardNumber || null,
      discountApplied: 0,
      pointsEarned: 0
    }
  });
});

// UC-C7: Validate Loyalty Card
router.post('/loyalty/validate', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { cardNumber } = req.body;

  if (!cardNumber || typeof cardNumber !== 'string') {
    return res.status(400).json({ error: 'Loyalty card number is required' });
  }

  res.json({
    storeId: parseInt(storeId, 10),
    cardNumber,
    valid: true,
    customer: {
      name: 'Customer Name',
      points: 100,
      tier: 'Silver'
    }
  });
});

// UC-C8: Offline Mode - Sync Pending Transactions
router.post('/offline/sync', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Transactions array is required' });
  }

  res.json({
    message: 'Transactions synced successfully',
    storeId: parseInt(storeId, 10),
    synced: transactions.length,
    failed: 0,
    results: transactions.map((tx: { localId: string }, index: number) => ({
      localId: tx.localId,
      serverId: index + 1,
      status: 'synced'
    }))
  });
});

// UC-C8: Get Offline Queue Status
router.get('/offline/status', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;

  res.json({
    storeId: parseInt(storeId, 10),
    offline: false,
    pendingTransactions: 0,
    lastSyncAt: new Date().toISOString()
  });
});

// UC-C8: Get Essential Data for Offline Mode
router.get('/offline/essentials', (req: Request<StorePOSParams>, res: Response) => {
  const { storeId } = req.params;

  res.json({
    storeId: parseInt(storeId, 10),
    products: [],
    prices: [],
    promotions: [],
    lastUpdated: new Date().toISOString()
  });
});

export default router;
