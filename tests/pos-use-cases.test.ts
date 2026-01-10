import request from 'supertest';
import app from '../src/app';

describe('POS/Cashier Use Cases - Store Endpoints', () => {
  const storeId = 1;

  // UC-C1: POS Checkout
  describe('UC-C1: POS Checkout', () => {
    it('POST /api/v1/stores/:storeId/pos/checkout creates a sale', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/checkout`)
        .send({
          cashierId: 1,
          items: [
            { productId: 1, quantity: 2, priceCents: 1000 },
            { productId: 2, quantity: 1, priceCents: 500 }
          ],
          payments: [{ method: 'cash', amountCents: 2500 }]
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Sale completed successfully');
      expect(res.body.sale).toHaveProperty('saleNumber');
      expect(res.body.sale).toHaveProperty('totalCents', 2500);
      expect(res.body).toHaveProperty('inventoryUpdated', true);
    });

    it('POST /api/v1/stores/:storeId/pos/checkout requires cashier ID', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/checkout`)
        .send({
          items: [{ productId: 1, quantity: 1, priceCents: 1000 }],
          payments: [{ method: 'cash', amountCents: 1000 }]
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Cashier ID is required');
    });
  });

  // UC-C2: Hold/Resume Sale
  describe('UC-C2: Hold/Resume Sale', () => {
    it('POST /api/v1/stores/:storeId/pos/sales/hold holds a sale', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/sales/hold`)
        .send({
          cashierId: 1,
          items: [{ productId: 1, quantity: 1, priceCents: 1000 }],
          note: 'Customer will return'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Sale held successfully');
      expect(res.body.heldSale).toHaveProperty('status', 'held');
    });

    it('GET /api/v1/stores/:storeId/pos/sales/held returns held sales', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/pos/sales/held`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/pos/sales/held/:saleId/resume resumes sale', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/sales/held/1/resume`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Sale resumed successfully');
    });

    it('DELETE /api/v1/stores/:storeId/pos/sales/held/:saleId cancels held sale', async () => {
      const res = await request(app)
        .delete(`/api/v1/stores/${storeId}/pos/sales/held/1`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Held sale cancelled');
    });
  });

  // UC-C3: Small Refund
  describe('UC-C3: Small Refund', () => {
    it('POST /api/v1/stores/:storeId/pos/refund processes small refund', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/refund`)
        .send({
          saleId: 1,
          items: [{ productId: 1, quantity: 1, priceCents: 5000 }],
          reason: 'Defective product',
          cashierId: 1
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Refund processed successfully');
      expect(res.body).toHaveProperty('inventoryRestocked', true);
    });

    it('POST /api/v1/stores/:storeId/pos/refund rejects large refund', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/refund`)
        .send({
          saleId: 1,
          items: [{ productId: 1, quantity: 1, priceCents: 15000 }],
          reason: 'Defective product'
        });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('requiresManagerApproval', true);
    });
  });

  // UC-C4: Print Invoice
  describe('UC-C4: Print Invoice/Receipt', () => {
    it('POST /api/v1/stores/:storeId/pos/sales/:saleId/print queues print job', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/sales/1/print`)
        .send({ format: 'thermal' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Invoice queued for printing');
      expect(res.body.receipt.printJob).toHaveProperty('status', 'queued');
    });

    it('GET /api/v1/stores/:storeId/pos/sales/:saleId/receipt returns receipt data', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/sales/1/receipt`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('receiptNumber');
    });

    it('GET /api/v1/stores/:storeId/pos/sales/:saleId/receipt?format=text returns text', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/sales/1/receipt?format=text`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
    });
  });

  // UC-C5: Shift Open/Close
  describe('UC-C5: Shift Management', () => {
    it('POST /api/v1/stores/:storeId/pos/shifts/open opens shift', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/shifts/open`)
        .send({
          cashierId: 1,
          openingCash: 10000
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Shift opened successfully');
      expect(res.body.shift).toHaveProperty('status', 'open');
    });

    it('POST /api/v1/stores/:storeId/pos/shifts/:shiftId/close closes shift', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/shifts/1/close`)
        .send({
          closingCash: 50000,
          notes: 'All good'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Shift closed successfully');
      expect(res.body.shift).toHaveProperty('reconciliation');
    });

    it('POST /api/v1/stores/:storeId/pos/shifts/:shiftId/close requires closing cash', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/shifts/1/close`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/v1/stores/:storeId/pos/shifts/current returns current shift', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/shifts/current`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
    });
  });

  // UC-C6: Inventory Lookup
  describe('UC-C6: Inventory Lookup', () => {
    it('GET /api/v1/stores/:storeId/pos/inventory/lookup by SKU', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/inventory/lookup?sku=SKU-001`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body.searchParams).toHaveProperty('sku', 'SKU-001');
    });

    it('GET /api/v1/stores/:storeId/pos/inventory/lookup requires search param', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/inventory/lookup`);
      expect(res.status).toBe(400);
    });

    it('GET /api/v1/stores/:storeId/pos/products/search searches products', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/products/search?q=milk`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('query', 'milk');
    });
  });

  // UC-C7: Promo/Loyalty Apply
  describe('UC-C7: Promotion/Loyalty', () => {
    it('POST /api/v1/stores/:storeId/pos/sales/apply-promotion applies promotion', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/sales/apply-promotion`)
        .send({
          saleId: 1,
          promotionId: 1
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Promotion/loyalty applied successfully');
    });

    it('POST /api/v1/stores/:storeId/pos/loyalty/validate validates loyalty card', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/loyalty/validate`)
        .send({
          cardNumber: 'CARD123456'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('valid', true);
      expect(res.body).toHaveProperty('customer');
    });
  });

  // UC-C8: Offline Mode
  describe('UC-C8: Offline Mode', () => {
    it('POST /api/v1/stores/:storeId/pos/offline/sync syncs transactions', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/pos/offline/sync`)
        .send({
          transactions: [
            { localId: 'offline-1', type: 'sale', data: {} },
            { localId: 'offline-2', type: 'sale', data: {} }
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Transactions synced successfully');
      expect(res.body).toHaveProperty('synced', 2);
    });

    it('GET /api/v1/stores/:storeId/pos/offline/status returns offline status', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/offline/status`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('offline', false);
    });

    it('GET /api/v1/stores/:storeId/pos/offline/essentials returns essential data', async () => {
      const res = await request(app)
        .get(`/api/v1/stores/${storeId}/pos/offline/essentials`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('products');
      expect(res.body).toHaveProperty('prices');
    });
  });
});
