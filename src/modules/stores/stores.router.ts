import { Router } from 'express';
import posRouter from '../pos/pos.router';
import shiftsRouter from '../shifts/shifts.router';
import * as posService from '../pos/pos.service';

const router = Router();

// GET /api/v1/stores
router.get('/', (_req, res) => {
  res.json({ items: [], total: 0 });
});

// GET /api/v1/stores/:id
router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Store Name', address: 'TBD' });
});

// POST /api/v1/stores
router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

// UC-C6: Quick Inventory Lookup by barcode
// GET /api/v1/stores/:storeId/inventories/lookup?barcode=...
router.get('/:storeId/inventories/lookup', async (req, res, next) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const barcode = req.query.barcode as string;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!barcode) {
      res.status(400).json({ error: 'Barcode is required' });
      return;
    }

    const result = await posService.inventoryLookup(storeId, barcode);
    
    // If no record found, return qty = 0 (as per edge case requirement)
    if (!result) {
      res.json({ 
        productId: null, 
        sku: barcode, 
        name: null, 
        barcode, 
        quantity: 0 
      });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Mount POS router for cashier operations
// Routes: /api/v1/stores/:storeId/pos/*
router.use('/:storeId/pos', posRouter);

// Mount Shifts router for shift management
// Routes: /api/v1/stores/:storeId/shifts/*
router.use('/:storeId/shifts', shiftsRouter);

export default router;
