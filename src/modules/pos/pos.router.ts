import { Router } from 'express';
import prisma from '../../db/prisma';

const router = Router();

// UC-C4: Receipt payload
router.get('/invoices/:id/receipt', async (req, res, next) => {
  try {
    const invoiceId = Number(req.params.id);
    if (!Number.isFinite(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice id' });
    }

    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        invoice_items: {
          include: {
            product_variants: {
              include: { products: true },
            },
          },
        },
        stores: true,
        users: true,
        customers: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({
      invoice,
      receipt: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        createdAt: invoice.created_at,
        store: invoice.stores,
        cashier: invoice.users,
        customer: invoice.customers,
        items: invoice.invoice_items.map((it) => ({
          id: it.id,
          variantId: it.variant_id,
          name: it.product_variants?.name ?? it.product_variants?.products?.name ?? null,
          barcode: it.product_variants?.barcode ?? null,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          lineTotal: it.line_total,
        })),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        paymentMethod: invoice.payment_method,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-C1: POS Checkout
 * Body:
 * {
 *   storeId: number,
 *   cashierId: number,
 *   customerId?: number,
 *   paymentMethod: string,
 *   items: [{ variantId: number, quantity: number }],
 *   discount?: number,
 *   tax?: number
 * }
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const { storeId, cashierId, customerId, paymentMethod, items, discount, tax } = req.body ?? {};

    if (!storeId || !cashierId || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedItems: Array<{ variantId: number; quantity: number }> = items
      .map((it: any) => ({ variantId: Number(it?.variantId), quantity: Number(it?.quantity) }))
      .filter((it) => Number.isFinite(it.variantId) && Number.isFinite(it.quantity) && it.quantity > 0);

    if (parsedItems.length !== items.length) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const variants = await tx.product_variants.findMany({
        where: { id: { in: parsedItems.map((i) => i.variantId) } },
      });

      if (variants.length !== parsedItems.length) {
        throw new Error('One or more variants not found');
      }

      const inventoryRows = await tx.inventories.findMany({
        where: {
          store_id: Number(storeId),
          variant_id: { in: parsedItems.map((i) => i.variantId) },
        },
      });

      // ensure inventory exists and has enough
      for (const item of parsedItems) {
        const inv = inventoryRows.find((r) => r.variant_id === item.variantId);
        if (!inv || inv.quantity === null) {
          throw new Error(`Inventory not found for variant ${item.variantId}`);
        }
        const available = Number(inv.quantity) - Number(inv.reserved ?? 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      const subtotal = parsedItems.reduce((sum, item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        return sum + Number(variant.price) * item.quantity;
      }, 0);

      const discountNum = discount !== undefined && discount !== null ? Number(discount) : 0;
      const taxNum = tax !== undefined && tax !== null ? Number(tax) : 0;
      const total = subtotal + taxNum - discountNum;

      const createdInvoice = await tx.invoices.create({
        data: {
          store_id: Number(storeId),
          customer_id: customerId ? Number(customerId) : null,
          created_by: Number(cashierId),
          payment_method: String(paymentMethod),
          subtotal,
          discount: discountNum,
          tax: taxNum,
          total,
        },
      });

      for (const item of parsedItems) {
        const variant = variants.find((v) => v.id === item.variantId)!;
        const inv = inventoryRows.find((r) => r.variant_id === item.variantId)!;

        await tx.invoice_items.create({
          data: {
            invoice_id: createdInvoice.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            unit_price: variant.price,
            unit_cost: inv.last_cost,
          },
        });

        await tx.inventories.update({
          where: { id: inv.id },
          data: {
            quantity: { decrement: item.quantity },
            last_update: new Date(),
          },
        });

        await tx.stock_movements.create({
          data: {
            store_id: Number(storeId),
            variant_id: item.variantId,
            change: -item.quantity,
            movement_type: 'sale',
            reference_id: String(createdInvoice.id),
            reason: 'POS checkout',
            created_by: Number(cashierId),
          },
        });
      }

      return tx.invoices.findUnique({
        where: { id: createdInvoice.id },
        include: { invoice_items: true },
      });
    });

    return res.status(201).json({ invoice });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-C2: Hold cart
 * For now we implement as a lightweight held invoice by setting payment_method = null and invoice_number = null.
 * This does NOT require DB schema changes.
 */
router.post('/hold', async (req, res, next) => {
  try {
    const { storeId, cashierId, customerId, items } = req.body ?? {};

    if (!storeId || !cashierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedItems: Array<{ variantId: number; quantity: number }> = items
      .map((it: any) => ({ variantId: Number(it?.variantId), quantity: Number(it?.quantity) }))
      .filter((it) => Number.isFinite(it.variantId) && Number.isFinite(it.quantity) && it.quantity > 0);

    if (parsedItems.length !== items.length) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    const held = await prisma.$transaction(async (tx) => {
      const variants = await tx.product_variants.findMany({
        where: { id: { in: parsedItems.map((i) => i.variantId) } },
      });

      if (variants.length !== parsedItems.length) {
        throw new Error('One or more variants not found');
      }

      const inventoryRows = await tx.inventories.findMany({
        where: {
          store_id: Number(storeId),
          variant_id: { in: parsedItems.map((i) => i.variantId) },
        },
      });

      // reserve stock
      for (const item of parsedItems) {
        const inv = inventoryRows.find((r) => r.variant_id === item.variantId);
        if (!inv || inv.quantity === null) {
          throw new Error(`Inventory not found for variant ${item.variantId}`);
        }
        const available = Number(inv.quantity) - Number(inv.reserved ?? 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for variant ${item.variantId}`);
        }
      }

      const subtotal = parsedItems.reduce((sum, item) => {
        const variant = variants.find((v) => v.id === item.variantId)!;
        return sum + Number(variant.price) * item.quantity;
      }, 0);

      const createdInvoice = await tx.invoices.create({
        data: {
          store_id: Number(storeId),
          customer_id: customerId ? Number(customerId) : null,
          created_by: Number(cashierId),
          payment_method: null,
          subtotal,
          discount: 0,
          tax: 0,
          total: subtotal,
        },
      });

      for (const item of parsedItems) {
        const variant = variants.find((v) => v.id === item.variantId)!;
        const inv = inventoryRows.find((r) => r.variant_id === item.variantId)!;

        await tx.invoice_items.create({
          data: {
            invoice_id: createdInvoice.id,
            variant_id: item.variantId,
            quantity: item.quantity,
            unit_price: variant.price,
            unit_cost: inv.last_cost,
          },
        });

        await tx.inventories.update({
          where: { id: inv.id },
          data: {
            reserved: { increment: item.quantity },
            last_update: new Date(),
          },
        });
      }

      return tx.invoices.findUnique({
        where: { id: createdInvoice.id },
        include: { invoice_items: true },
      });
    });

    return res.status(201).json({ invoice: held });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-C2: Resume held cart
 * Converts reserved quantities into a real checkout (decrement quantity, release reserved).
 */
router.post('/resume/:id/checkout', async (req, res, next) => {
  try {
    const invoiceId = Number(req.params.id);
    const { paymentMethod } = req.body ?? {};

    if (!Number.isFinite(invoiceId) || !paymentMethod) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.findUnique({
        where: { id: invoiceId },
        include: { invoice_items: true },
      });

      if (!invoice) {
        return null;
      }

      if (invoice.payment_method) {
        throw new Error('Invoice is already paid/checked out');
      }

      const storeId = invoice.store_id;
      const cashierId = invoice.created_by;

      if (!storeId || !cashierId) {
        throw new Error('Held invoice missing store/cashier');
      }

      const variantIds = invoice.invoice_items.map((it) => it.variant_id).filter((v): v is number => typeof v === 'number');
      const inventoryRows = await tx.inventories.findMany({
        where: { store_id: storeId, variant_id: { in: variantIds } },
      });

      for (const item of invoice.invoice_items) {
        if (!item.variant_id) continue;
        const inv = inventoryRows.find((r) => r.variant_id === item.variant_id);
        if (!inv || inv.quantity === null) {
          throw new Error(`Inventory not found for variant ${item.variant_id}`);
        }
        const qty = Number(item.quantity);

        // Final availability check includes reserved
        const available = Number(inv.quantity) - (Number(inv.reserved ?? 0) - qty);
        if (available < qty) {
          throw new Error(`Insufficient stock for variant ${item.variant_id}`);
        }
      }

      for (const item of invoice.invoice_items) {
        if (!item.variant_id) continue;
        const inv = inventoryRows.find((r) => r.variant_id === item.variant_id)!;
        const qty = Number(item.quantity);

        await tx.inventories.update({
          where: { id: inv.id },
          data: {
            reserved: { decrement: qty },
            quantity: { decrement: qty },
            last_update: new Date(),
          },
        });

        await tx.stock_movements.create({
          data: {
            store_id: storeId,
            variant_id: item.variant_id,
            change: -qty,
            movement_type: 'sale',
            reference_id: String(invoice.id),
            reason: 'POS resume checkout',
            created_by: cashierId,
          },
        });
      }

      await tx.invoices.update({
        where: { id: invoiceId },
        data: { payment_method: String(paymentMethod) },
      });

      return tx.invoices.findUnique({
        where: { id: invoiceId },
        include: { invoice_items: true },
      });
    });

    if (!result) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    return res.json({ invoice: result });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-C3: Partial refund ("refund nhỏ")
 * Body: { storeId, cashierId, items: [{ invoiceItemId, quantity }], reason? }
 */
router.post('/refund', async (req, res, next) => {
  try {
    const { storeId, cashierId, items, reason } = req.body ?? {};

    if (!storeId || !cashierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const parsedItems: Array<{ invoiceItemId: number; quantity: number }> = items
      .map((it: any) => ({ invoiceItemId: Number(it?.invoiceItemId), quantity: Number(it?.quantity) }))
      .filter((it) => Number.isFinite(it.invoiceItemId) && Number.isFinite(it.quantity) && it.quantity > 0);

    if (parsedItems.length !== items.length) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    const refundResult = await prisma.$transaction(async (tx) => {
      const invoiceItems = await tx.invoice_items.findMany({
        where: { id: { in: parsedItems.map((i) => i.invoiceItemId) } },
      });

      if (invoiceItems.length !== parsedItems.length) {
        throw new Error('One or more invoice items not found');
      }

      // Ensure all belong to same invoice
      const invoiceId = invoiceItems[0].invoice_id;
      if (!invoiceId || invoiceItems.some((it) => it.invoice_id !== invoiceId)) {
        throw new Error('Refund items must belong to the same invoice');
      }

      const invoice = await tx.invoices.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Apply refund: increase inventory, add stock movement. We do not yet persist a separate refund table.
      let totalRefund = 0;

      for (const reqItem of parsedItems) {
        const invItem = invoiceItems.find((it) => it.id === reqItem.invoiceItemId)!;
        if (!invItem.variant_id) {
          throw new Error(`Invoice item ${invItem.id} missing variant_id`);
        }

        const soldQty = Number(invItem.quantity);
        const refundQty = reqItem.quantity;
        if (refundQty > soldQty) {
          throw new Error(`Refund quantity exceeds sold quantity for invoice item ${invItem.id}`);
        }

        const unitPrice = Number(invItem.unit_price);
        totalRefund += unitPrice * refundQty;

        const inventory = await tx.inventories.findFirst({
          where: { store_id: Number(storeId), variant_id: invItem.variant_id },
        });

        if (!inventory) {
          throw new Error(`Inventory not found for variant ${invItem.variant_id}`);
        }

        await tx.inventories.update({
          where: { id: inventory.id },
          data: {
            quantity: { increment: refundQty },
            last_update: new Date(),
          },
        });

        await tx.stock_movements.create({
          data: {
            store_id: Number(storeId),
            variant_id: invItem.variant_id,
            change: refundQty,
            movement_type: 'refund',
            reference_id: String(invoiceId),
            reason: reason ? String(reason) : 'POS partial refund',
            created_by: Number(cashierId),
          },
        });
      }

      return {
        invoiceId,
        totalRefund,
      };
    });

    return res.status(201).json({ refund: refundResult });
  } catch (err) {
    next(err);
  }
});

export default router;
