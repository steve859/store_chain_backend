import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StoreProductParams extends StoreParams {
  productId: string;
}

/**
 * UC-M1 — Store Product & Variant Management
 * Actor: store_manager
 * Pre-condition: Manager is assigned to store
 */

// GET /api/v1/stores/:storeId/products - List products for a store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  res.json({ 
    storeId: parseInt(storeId, 10),
    items: [], 
    total: 0 
  });
});

// GET /api/v1/stores/:storeId/products/:productId - Get a specific product
router.get('/:productId', (req: Request<StoreProductParams>, res: Response) => {
  const { storeId, productId } = req.params;
  res.json({ 
    storeId: parseInt(storeId, 10),
    productId: parseInt(productId, 10),
    name: 'Product Name',
    sku: 'SKU-000',
    variants: [],
    inventory: {
      quantity: 0,
      reserved: 0
    }
  });
});

// POST /api/v1/stores/:storeId/products - Create product for store (with inventory record)
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { sku, name, barcode, price, variants } = req.body;

  // Validation
  if (!sku || typeof sku !== 'string') {
    return res.status(400).json({ error: 'SKU is required' });
  }

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (barcode !== undefined && typeof barcode !== 'string') {
    return res.status(400).json({ error: 'Barcode must be a string' });
  }

  // Response with created product (stub - actual DB operations would be done via Prisma)
  res.status(201).json({
    message: 'Product created successfully',
    product: {
      id: 1,
      storeId: parseInt(storeId, 10),
      sku,
      name,
      barcode: barcode || null,
      price: price || null,
      variants: variants || [],
      inventory: {
        quantity: 0,
        reserved: 0
      }
    },
    audit: {
      action: 'CREATE_PRODUCT',
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/v1/stores/:storeId/products/:productId - Update product
router.put('/:productId', (req: Request<StoreProductParams>, res: Response) => {
  const { storeId, productId } = req.params;
  const { name, price } = req.body;

  res.json({
    message: 'Product updated successfully',
    product: {
      id: parseInt(productId, 10),
      storeId: parseInt(storeId, 10),
      name: name || 'Product Name',
      price: price || null
    },
    audit: {
      action: 'UPDATE_PRODUCT',
      timestamp: new Date().toISOString()
    }
  });
});

// DELETE /api/v1/stores/:storeId/products/:productId - Delete product
router.delete('/:productId', (req: Request<StoreProductParams>, res: Response) => {
  const { storeId, productId } = req.params;

  res.json({
    message: 'Product deleted successfully',
    productId: parseInt(productId, 10),
    storeId: parseInt(storeId, 10),
    audit: {
      action: 'DELETE_PRODUCT',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/products/import - Import products from CSV
router.post('/import', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  
  res.status(201).json({
    message: 'Products import initiated',
    storeId: parseInt(storeId, 10),
    imported: 0,
    failed: 0,
    errors: []
  });
});

export default router;
