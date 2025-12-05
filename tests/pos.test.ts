import request from 'supertest';
import app from '../src/app';
import * as posService from '../src/modules/pos/pos.service';
import * as shiftsService from '../src/modules/shifts/shifts.service';

describe('POS Checkout (UC-C1)', () => {
  beforeEach(() => {
    posService.clearAllData();
  });

  it('POST /api/v1/stores/:storeId/pos/checkout creates a sale', async () => {
    const checkoutData = {
      items: [
        { productId: 1, quantity: 2, unitPrice: 1000 },
        { productId: 2, quantity: 1, unitPrice: 500 }
      ],
      cashierId: 1,
      payments: [
        { method: 'cash', amountCents: 2500 }
      ]
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('invoiceId');
    expect(res.body).toHaveProperty('saleNumber');
    expect(res.body.totalCents).toBe(2500);
    expect(res.body.items).toHaveLength(2);
  });

  it('POST /api/v1/stores/:storeId/pos/checkout returns 400 for empty cart', async () => {
    const checkoutData = {
      items: [],
      cashierId: 1,
      payments: [{ method: 'cash', amountCents: 100 }]
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cart is empty');
  });

  it('POST /api/v1/stores/:storeId/pos/checkout returns 400 without cashierId', async () => {
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 1000 }],
      payments: [{ method: 'cash', amountCents: 1000 }]
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Cashier ID is required');
  });

  it('POST /api/v1/stores/:storeId/pos/checkout returns 400 without payments', async () => {
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 1000 }],
      cashierId: 1
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Payment information is required');
  });

  it('POST /api/v1/stores/:storeId/pos/checkout applies promo code (UC-C7)', async () => {
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 1000 }],
      cashierId: 1,
      payments: [{ method: 'cash', amountCents: 900 }],
      promoCode: 'SAVE10'
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    expect(res.status).toBe(201);
    expect(res.body.totalCents).toBe(900); // 10% discount applied
  });
});

describe('Hold Cart & Resume (UC-C2)', () => {
  beforeEach(() => {
    posService.clearAllData();
  });

  it('POST /api/v1/stores/:storeId/pos/holds creates a held cart', async () => {
    const holdData = {
      items: [{ productId: 1, quantity: 2, unitPrice: 1000 }],
      cashierId: 1
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/holds')
      .send(holdData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body.items).toHaveLength(1);
  });

  it('GET /api/v1/stores/:storeId/pos/holds/:id retrieves a held cart', async () => {
    // First create a held cart
    const holdData = {
      items: [{ productId: 1, quantity: 2, unitPrice: 1000 }],
      cashierId: 1
    };

    const createRes = await request(app)
      .post('/api/v1/stores/1/pos/holds')
      .send(holdData);

    const holdId = createRes.body.id;

    // Then retrieve it
    const res = await request(app)
      .get(`/api/v1/stores/1/pos/holds/${holdId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(holdId);
    expect(res.body.items).toHaveLength(1);
  });

  it('GET /api/v1/stores/:storeId/pos/holds/:id returns 404 for non-existent cart', async () => {
    const res = await request(app)
      .get('/api/v1/stores/1/pos/holds/9999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Held cart not found or expired');
  });

  it('DELETE /api/v1/stores/:storeId/pos/holds/:id removes a held cart', async () => {
    // First create a held cart
    const holdData = {
      items: [{ productId: 1, quantity: 2, unitPrice: 1000 }],
      cashierId: 1
    };

    const createRes = await request(app)
      .post('/api/v1/stores/1/pos/holds')
      .send(holdData);

    const holdId = createRes.body.id;

    // Delete it
    const deleteRes = await request(app)
      .delete(`/api/v1/stores/1/pos/holds/${holdId}`);

    expect(deleteRes.status).toBe(204);

    // Verify it's gone
    const getRes = await request(app)
      .get(`/api/v1/stores/1/pos/holds/${holdId}`);

    expect(getRes.status).toBe(404);
  });
});

describe('Refund (UC-C3)', () => {
  beforeEach(() => {
    posService.clearAllData();
  });

  it('POST /api/v1/stores/:storeId/pos/refund creates a refund', async () => {
    // First create a sale
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 5000 }],
      cashierId: 1,
      payments: [{ method: 'cash', amountCents: 5000 }]
    };

    const saleRes = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    const saleId = saleRes.body.invoiceId;

    // Then create a refund
    const refundData = {
      originalSaleId: saleId,
      cashierId: 1,
      items: [{ productId: 1, quantity: 1, amountCents: 5000 }],
      reason: 'Customer returned item'
    };

    const refundRes = await request(app)
      .post('/api/v1/stores/1/pos/refund')
      .send(refundData);

    expect(refundRes.status).toBe(201);
    expect(refundRes.body).toHaveProperty('refundNumber');
    expect(refundRes.body.amountCents).toBe(5000);
    expect(refundRes.body.status).toBe('completed');
  });

  it('POST /api/v1/stores/:storeId/pos/refund requires manager approval for large refunds', async () => {
    // First create a sale
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 15000 }],
      cashierId: 1,
      payments: [{ method: 'cash', amountCents: 15000 }]
    };

    const saleRes = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    const saleId = saleRes.body.invoiceId;

    // Create a large refund without manager approval
    const refundData = {
      originalSaleId: saleId,
      cashierId: 1,
      items: [{ productId: 1, quantity: 1, amountCents: 15000 }],
      reason: 'Defective product'
    };

    const refundRes = await request(app)
      .post('/api/v1/stores/1/pos/refund')
      .send(refundData);

    expect(refundRes.status).toBe(201);
    expect(refundRes.body.status).toBe('pending_approval');
    expect(refundRes.body.requiresApproval).toBe(true);
  });

  it('POST /api/v1/stores/:storeId/pos/refund returns 400 for missing originalSaleId', async () => {
    const refundData = {
      cashierId: 1,
      items: [{ productId: 1, quantity: 1, amountCents: 1000 }],
      reason: 'Test'
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/refund')
      .send(refundData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Original sale ID is required');
  });
});

describe('Print Invoice (UC-C4)', () => {
  beforeEach(() => {
    posService.clearAllData();
  });

  it('POST /api/v1/stores/:storeId/pos/:invoiceId/print creates a print job', async () => {
    // First create a sale
    const checkoutData = {
      items: [{ productId: 1, quantity: 1, unitPrice: 1000 }],
      cashierId: 1,
      payments: [{ method: 'cash', amountCents: 1000 }]
    };

    const saleRes = await request(app)
      .post('/api/v1/stores/1/pos/checkout')
      .send(checkoutData);

    const invoiceId = saleRes.body.invoiceId;

    // Print the invoice
    const printData = {
      printedBy: 1,
      printType: 'receipt'
    };

    const printRes = await request(app)
      .post(`/api/v1/stores/1/pos/${invoiceId}/print`)
      .send(printData);

    expect(printRes.status).toBe(201);
    expect(printRes.body).toHaveProperty('printJobId');
    expect(printRes.body.invoiceId).toBe(invoiceId);
    expect(printRes.body.status).toBe('printed');
  });

  it('POST /api/v1/stores/:storeId/pos/:invoiceId/print returns 400 without printedBy', async () => {
    const printData = {
      printType: 'receipt'
    };

    const res = await request(app)
      .post('/api/v1/stores/1/pos/1/print')
      .send(printData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Printed by user ID is required');
  });
});

describe('Shift Open/Close (UC-C5)', () => {
  beforeEach(() => {
    shiftsService.clearAllData();
  });

  it('POST /api/v1/stores/:storeId/shifts/open creates a new shift', async () => {
    const shiftData = {
      cashierId: 1,
      openingCash: 10000
    };

    const res = await request(app)
      .post('/api/v1/stores/1/shifts/open')
      .send(shiftData);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('open');
    expect(res.body.openingCash).toBe(10000);
  });

  it('POST /api/v1/stores/:storeId/shifts/open prevents overlapping shifts', async () => {
    const shiftData = {
      cashierId: 1,
      openingCash: 10000
    };

    // Open first shift
    await request(app)
      .post('/api/v1/stores/1/shifts/open')
      .send(shiftData);

    // Try to open second shift
    const res = await request(app)
      .post('/api/v1/stores/1/shifts/open')
      .send(shiftData);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already exists');
  });

  it('POST /api/v1/stores/:storeId/shifts/close closes an open shift', async () => {
    // First open a shift
    await request(app)
      .post('/api/v1/stores/1/shifts/open')
      .send({ cashierId: 1, openingCash: 10000 });

    // Close the shift
    const closeData = {
      cashierId: 1,
      closingCash: 15000
    };

    const res = await request(app)
      .post('/api/v1/stores/1/shifts/close')
      .send(closeData);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
    expect(res.body.closingCash).toBe(15000);
    expect(res.body).toHaveProperty('discrepancy');
  });

  it('POST /api/v1/stores/:storeId/shifts/close returns 404 when no open shift', async () => {
    const closeData = {
      cashierId: 1,
      closingCash: 15000
    };

    const res = await request(app)
      .post('/api/v1/stores/1/shifts/close')
      .send(closeData);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('No open shift');
  });

  it('POST /api/v1/stores/:storeId/shifts/close logs cash discrepancy', async () => {
    // Open a shift
    await request(app)
      .post('/api/v1/stores/1/shifts/open')
      .send({ cashierId: 1, openingCash: 10000 });

    // Close with different amount
    const closeData = {
      cashierId: 1,
      closingCash: 8000 // Less than opening
    };

    const res = await request(app)
      .post('/api/v1/stores/1/shifts/close')
      .send(closeData);

    expect(res.status).toBe(200);
    expect(res.body.discrepancy).toBe(-2000);
    expect(res.body.discrepancyLogged).toBe(true);
  });
});

describe('Inventory Lookup (UC-C6)', () => {
  it('GET /api/v1/stores/:storeId/inventories/lookup returns product info', async () => {
    const res = await request(app)
      .get('/api/v1/stores/1/inventories/lookup')
      .query({ barcode: 'SKU-001' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('productId');
    expect(res.body).toHaveProperty('quantity');
    expect(res.body.barcode).toBe('SKU-001');
  });

  it('GET /api/v1/stores/:storeId/inventories/lookup returns qty 0 for non-existent product', async () => {
    const res = await request(app)
      .get('/api/v1/stores/1/inventories/lookup')
      .query({ barcode: 'NON-EXISTENT' });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(0);
  });

  it('GET /api/v1/stores/:storeId/inventories/lookup returns 400 without barcode', async () => {
    const res = await request(app)
      .get('/api/v1/stores/1/inventories/lookup');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Barcode is required');
  });
});
