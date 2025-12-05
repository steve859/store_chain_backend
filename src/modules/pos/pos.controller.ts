import { Request, Response, NextFunction } from 'express';
import * as posService from './pos.service';
import {
  CheckoutRequest,
  HoldCartRequest,
  RefundRequest,
  PrintRequest
} from './pos.types';

// UC-C1: POS Checkout
export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const checkoutData: CheckoutRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!checkoutData.items || checkoutData.items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    if (!checkoutData.cashierId) {
      res.status(400).json({ error: 'Cashier ID is required' });
      return;
    }

    if (!checkoutData.payments || checkoutData.payments.length === 0) {
      res.status(400).json({ error: 'Payment information is required' });
      return;
    }

    const result = await posService.processCheckout(storeId, checkoutData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// UC-C2: Hold Cart
export const holdCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const holdData: HoldCartRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!holdData.items || holdData.items.length === 0) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    if (!holdData.cashierId) {
      res.status(400).json({ error: 'Cashier ID is required' });
      return;
    }

    const result = await posService.holdCart(storeId, holdData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// UC-C2: Get Held Cart
export const getHeldCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const holdId = parseInt(req.params.id, 10);

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!holdId || isNaN(holdId)) {
      res.status(400).json({ error: 'Invalid hold ID' });
      return;
    }

    const result = await posService.getHeldCart(storeId, holdId);
    if (!result) {
      res.status(404).json({ error: 'Held cart not found or expired' });
      return;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// UC-C2: Delete/Resume Held Cart
export const deleteHeldCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const holdId = parseInt(req.params.id, 10);

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!holdId || isNaN(holdId)) {
      res.status(400).json({ error: 'Invalid hold ID' });
      return;
    }

    const deleted = await posService.deleteHeldCart(storeId, holdId);
    if (!deleted) {
      res.status(404).json({ error: 'Held cart not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// UC-C3: Process Refund
export const processRefund = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const refundData: RefundRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!refundData.originalSaleId) {
      res.status(400).json({ error: 'Original sale ID is required' });
      return;
    }

    if (!refundData.cashierId) {
      res.status(400).json({ error: 'Cashier ID is required' });
      return;
    }

    if (!refundData.items || refundData.items.length === 0) {
      res.status(400).json({ error: 'Refund items are required' });
      return;
    }

    if (!refundData.reason) {
      res.status(400).json({ error: 'Refund reason is required' });
      return;
    }

    const result = await posService.processRefund(storeId, refundData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// UC-C4: Print Invoice
export const printInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const invoiceId = parseInt(req.params.invoiceId, 10);
    const printData: PrintRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!invoiceId || isNaN(invoiceId)) {
      res.status(400).json({ error: 'Invalid invoice ID' });
      return;
    }

    if (!printData.printedBy) {
      res.status(400).json({ error: 'Printed by user ID is required' });
      return;
    }

    const result = await posService.printInvoice(storeId, invoiceId, printData);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
