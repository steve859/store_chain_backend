import request from 'supertest';
import app from '../src/app';

describe('Manager Use Cases - Store Endpoints', () => {
  const storeId = 1;

  // UC-M1: Store Product Management
  describe('UC-M1: Store Products (/api/v1/stores/:storeId/products)', () => {
    it('GET /api/v1/stores/:storeId/products returns product list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/products`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
    });

    it('GET /api/v1/stores/:storeId/products/:productId returns product details', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/products/1`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('productId', 1);
      expect(res.body).toHaveProperty('inventory');
    });

    it('POST /api/v1/stores/:storeId/products creates a product', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/products`)
        .send({
          sku: 'TEST-SKU-001',
          name: 'Test Product',
          barcode: '1234567890123'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Product created successfully');
      expect(res.body.product).toHaveProperty('sku', 'TEST-SKU-001');
      expect(res.body).toHaveProperty('audit');
    });

    it('POST /api/v1/stores/:storeId/products returns 400 for missing SKU', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/products`)
        .send({ name: 'Test Product' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'SKU is required');
    });
  });

  // UC-M2: Inventory Management
  describe('UC-M2: Inventory (/api/v1/stores/:storeId/inventories)', () => {
    it('GET /api/v1/stores/:storeId/inventories returns inventory list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/inventories`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/inventories/:id/adjust adjusts inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/inventories/1/adjust`)
        .send({
          adjustmentType: 'increase',
          quantity: 50,
          reason: 'Stock received'
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Inventory adjusted successfully');
      expect(res.body).toHaveProperty('movement');
      expect(res.body).toHaveProperty('audit');
    });

    it('POST /api/v1/stores/:storeId/inventories/:id/adjust returns 400 for invalid type', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/inventories/1/adjust`)
        .send({
          adjustmentType: 'invalid',
          quantity: 50
        });
      expect(res.status).toBe(400);
    });
  });

  // UC-M3: Purchase Orders
  describe('UC-M3: Purchase Orders (/api/v1/stores/:storeId/purchase-orders)', () => {
    it('GET /api/v1/stores/:storeId/purchase-orders returns PO list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/purchase-orders`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/purchase-orders creates a PO', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/purchase-orders`)
        .send({
          supplierId: 1,
          lines: [{ productId: 1, quantity: 100 }]
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Purchase order created successfully');
      expect(res.body.purchaseOrder).toHaveProperty('poNumber');
      expect(res.body).toHaveProperty('audit');
    });

    it('POST /api/v1/stores/:storeId/purchase-orders/:poId/receive receives goods', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/purchase-orders/1/receive`)
        .send({
          lines: [{ productId: 1, receivedQuantity: 100, orderedQuantity: 100 }],
          receivedBy: 1
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('grn');
      expect(res.body).toHaveProperty('inventoryUpdated', true);
    });
  });

  // UC-M4: Reports
  describe('UC-M4: Reports (/api/v1/stores/:storeId/reports)', () => {
    it('GET /api/v1/stores/:storeId/reports returns available reports', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/reports`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('availableReports');
    });

    it('GET /api/v1/stores/:storeId/reports/revenue returns revenue report', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/reports/revenue`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reportType', 'revenue');
      expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/stores/:storeId/reports/low-stock returns low stock report', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/reports/low-stock`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reportType', 'low-stock');
    });

    it('GET /api/v1/stores/:storeId/reports/revenue?format=csv returns CSV', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/reports/revenue?format=csv`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  // UC-M5: Store Users
  describe('UC-M5: Store Users (/api/v1/stores/:storeId/users)', () => {
    it('GET /api/v1/stores/:storeId/users returns user list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/users`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/users assigns user to store', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/users`)
        .send({ userId: 1, role: 'cashier' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User assigned to store successfully');
    });

    it('POST /api/v1/stores/:storeId/users/:userId/shifts creates shift', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/users/1/shifts`)
        .send({ startTime: '2024-01-01T08:00:00Z' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('shift');
    });

    it('POST /api/v1/stores/:storeId/users/:userId/shifts/:shiftId/close requires reconciliation', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/users/1/shifts/1/close`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/v1/stores/:storeId/users/:userId/shifts/:shiftId/close succeeds with cash count', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/users/1/shifts/1/close`)
        .send({ cashCount: 1000 });
      expect(res.status).toBe(200);
      expect(res.body.shift).toHaveProperty('reconciliation');
    });
  });

  // UC-M6: Promotions
  describe('UC-M6: Promotions (/api/v1/stores/:storeId/promotions)', () => {
    it('GET /api/v1/stores/:storeId/promotions returns promotion list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/promotions`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/promotions creates a promotion', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/promotions`)
        .send({
          name: 'Summer Sale',
          type: 'discount',
          discountPercent: 10
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('promotion');
      expect(res.body).toHaveProperty('conflicts');
    });

    it('POST /api/v1/stores/:storeId/promotions/:promotionId/activate activates promotion', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/promotions/1/activate`);
      expect(res.status).toBe(200);
      expect(res.body.promotion).toHaveProperty('status', 'active');
    });
  });

  // UC-M7: Returns
  describe('UC-M7: Returns (/api/v1/stores/:storeId/returns)', () => {
    it('GET /api/v1/stores/:storeId/returns returns list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/returns`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/returns creates a return', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/returns`)
        .send({
          saleId: 1,
          items: [{ productId: 1, quantity: 1, priceCents: 1000 }],
          reason: 'Defective product',
          refundMethod: 'cash'
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('return');
      expect(res.body).toHaveProperty('stockMovement');
    });

    it('POST /api/v1/stores/:storeId/returns requires valid refund method', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/returns`)
        .send({
          saleId: 1,
          items: [{ productId: 1, quantity: 1 }],
          reason: 'Test',
          refundMethod: 'invalid'
        });
      expect(res.status).toBe(400);
    });
  });

  // UC-M8: Transfers
  describe('UC-M8: Transfers (/api/v1/stores/:storeId/transfers)', () => {
    it('GET /api/v1/stores/:storeId/transfers returns transfer list', async () => {
      const res = await request(app).get(`/api/v1/stores/${storeId}/transfers`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('storeId', storeId);
      expect(res.body).toHaveProperty('items');
    });

    it('POST /api/v1/stores/:storeId/transfers creates a transfer', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/transfers`)
        .send({
          toStoreId: 2,
          items: [{ productId: 1, quantity: 10 }]
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('transfer');
      expect(res.body.transfer).toHaveProperty('transferNumber');
    });

    it('POST /api/v1/stores/:storeId/transfers prevents same-store transfer', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/transfers`)
        .send({
          toStoreId: storeId,
          items: [{ productId: 1, quantity: 10 }]
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Cannot transfer to the same store');
    });

    it('POST /api/v1/stores/:storeId/transfers/:transferId/ship reserves inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/transfers/1/ship`)
        .send({ shippedBy: 1 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('inventoryReserved', true);
      expect(res.body.transfer).toHaveProperty('status', 'in_transit');
    });

    it('POST /api/v1/stores/:storeId/transfers/:transferId/receive updates inventory', async () => {
      const res = await request(app)
        .post(`/api/v1/stores/${storeId}/transfers/1/receive`)
        .send({
          items: [{ productId: 1, receivedQuantity: 10, expectedQuantity: 10 }],
          receivedBy: 1
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('inventoryUpdated', true);
    });
  });
});
