import { Router } from 'express';
import * as posController from './pos.controller';

const router = Router({ mergeParams: true });

// UC-C1: POS Checkout
// POST /api/v1/stores/:storeId/pos/checkout
router.post('/checkout', posController.checkout);

// UC-C2: Hold Cart
// POST /api/v1/stores/:storeId/pos/holds
router.post('/holds', posController.holdCart);

// UC-C2: Get Held Cart
// GET /api/v1/stores/:storeId/pos/holds/:id
router.get('/holds/:id', posController.getHeldCart);

// UC-C2: Resume Held Cart (delete after retrieval)
// DELETE /api/v1/stores/:storeId/pos/holds/:id
router.delete('/holds/:id', posController.deleteHeldCart);

// UC-C3: Process Refund
// POST /api/v1/stores/:storeId/pos/refund
router.post('/refund', posController.processRefund);

// UC-C4: Print/Resend Invoice
// POST /api/v1/stores/:storeId/pos/:invoiceId/print
router.post('/:invoiceId/print', posController.printInvoice);

// UC-C6: Quick Inventory Lookup by barcode
// GET /api/v1/stores/:storeId/inventories/lookup?barcode=...
// Note: This is mounted in stores router, not pos router

export default router;
