import {
  CheckoutRequest,
  CheckoutResponse,
  HoldCartRequest,
  HoldCartResponse,
  RefundRequest,
  RefundResponse,
  PrintRequest,
  PrintResponse,
  InventoryLookupResponse,
  CartItem
} from './pos.types';

// Constants
const REFUND_MANAGER_APPROVAL_THRESHOLD_CENTS = 10000; // $100 requires manager approval
const REFUND_TIME_WINDOW_HOURS = 72; // 3 days refund window
const DEFAULT_HOLD_EXPIRY_MINUTES = 30;

// Valid promo codes configuration
// In production, these would be stored in database and validated via Prisma
const VALID_PROMO_CODES = ['SAVE10', 'WELCOME', 'LOYALTY'] as const;
const PROMO_DISCOUNT_PERCENTAGE = 0.1; // 10% discount

// Type definitions for in-memory storage
interface StoredHeldCart {
  storeId: number;
  data: HoldCartResponse & { cashierId: number; status: string };
}

interface StoredSale {
  storeId: number;
  saleNumber: string;
  totalCents: number;
  items: unknown[];
  createdAt: Date;
}

interface StoredRefund {
  storeId: number;
  data: RefundResponse & { originalSaleId: number };
}

// In-memory storage for mock implementation
// In production, these would be database operations via Prisma
const heldCarts: Map<number, StoredHeldCart> = new Map();
const sales: Map<number, StoredSale> = new Map();
const refunds: Map<number, StoredRefund> = new Map();
const printJobs: Map<number, PrintResponse> = new Map();

let holdIdCounter = 1;
let saleIdCounter = 1;
let refundIdCounter = 1;
let printJobIdCounter = 1;

// Generate unique sale/refund numbers
const generateSaleNumber = (storeId: number): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `S${storeId}-${dateStr}-${String(saleIdCounter).padStart(6, '0')}`;
};

const generateRefundNumber = (storeId: number): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `R${storeId}-${dateStr}-${String(refundIdCounter).padStart(6, '0')}`;
};

// Calculate total from cart items
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
};

// UC-C1: Process Checkout
// Creates invoice, decrements inventory, prepares receipt data
export const processCheckout = async (
  storeId: number,
  checkoutData: CheckoutRequest
): Promise<CheckoutResponse> => {
  const { items, payments, promoCode, customerId } = checkoutData;

  // Calculate total
  let totalCents = calculateTotal(items);

  // UC-C7: Apply promo code if provided
  if (promoCode) {
    const discount = await applyPromoCode(promoCode, totalCents, customerId);
    totalCents -= discount;
  }

  // Validate payment total
  const paymentTotal = payments.reduce((sum, p) => sum + p.amountCents, 0);
  if (paymentTotal < totalCents) {
    throw new Error('Insufficient payment amount');
  }

  // Generate sale number
  const saleNumber = generateSaleNumber(storeId);
  const saleId = saleIdCounter++;
  const createdAt = new Date();

  // Create sale items response
  const saleItems = items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPriceCents: item.unitPrice,
    lineTotalCents: item.quantity * item.unitPrice
  }));

  // Store sale for refund validation
  sales.set(saleId, {
    storeId,
    saleNumber,
    totalCents,
    items: saleItems,
    createdAt
  });

  // In production: Use Prisma transaction to atomically:
  // 1. Create Sales record
  // 2. Create SaleItem records
  // 3. Decrement InventoryRecord quantities (with row locking for race condition)
  // 4. Create InventoryTransaction records for stock movement

  return {
    invoiceId: saleId,
    saleNumber,
    totalCents,
    items: saleItems,
    payments,
    createdAt
  };
};

// UC-C7: Apply promo code
const applyPromoCode = async (
  promoCode: string,
  totalCents: number,
  _customerId?: number
): Promise<number> => {
  // Mock implementation - in production, validate against promo table
  // Check validity window, per-customer limits, etc.
  
  if (VALID_PROMO_CODES.includes(promoCode.toUpperCase() as typeof VALID_PROMO_CODES[number])) {
    return Math.floor(totalCents * PROMO_DISCOUNT_PERCENTAGE);
  }
  return 0;
};

// UC-C2: Hold Cart
export const holdCart = async (
  storeId: number,
  holdData: HoldCartRequest
): Promise<HoldCartResponse> => {
  const { items, cashierId, expiresInMinutes = DEFAULT_HOLD_EXPIRY_MINUTES } = holdData;

  const id = holdIdCounter++;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + expiresInMinutes * 60 * 1000);

  const holdResponse: HoldCartResponse = {
    id,
    items,
    expiresAt,
    createdAt
  };

  heldCarts.set(id, {
    storeId,
    data: {
      ...holdResponse,
      cashierId,
      status: 'held'
    }
  });

  // In production: Reserve quantities in inventory (reservedQty field)
  // This prevents overselling while cart is held

  return holdResponse;
};

// UC-C2: Get Held Cart
export const getHeldCart = async (
  storeId: number,
  holdId: number
): Promise<HoldCartResponse | null> => {
  const held = heldCarts.get(holdId);
  
  if (!held || held.storeId !== storeId) {
    return null;
  }

  // Check if expired
  if (new Date() > held.data.expiresAt) {
    // Expired - release reserved quantities and delete
    heldCarts.delete(holdId);
    return null;
  }

  if (held.data.status !== 'held') {
    return null;
  }

  return {
    id: held.data.id,
    items: held.data.items,
    expiresAt: held.data.expiresAt,
    createdAt: held.data.createdAt
  };
};

// UC-C2: Delete Held Cart (after resume)
export const deleteHeldCart = async (
  storeId: number,
  holdId: number
): Promise<boolean> => {
  const held = heldCarts.get(holdId);
  
  if (!held || held.storeId !== storeId) {
    return false;
  }

  // In production: Release reserved quantities in inventory
  heldCarts.delete(holdId);
  return true;
};

// UC-C3: Process Refund
export const processRefund = async (
  storeId: number,
  refundData: RefundRequest
): Promise<RefundResponse> => {
  const { originalSaleId, items, managerId } = refundData;

  // Validate original sale exists and belongs to store
  const originalSale = sales.get(originalSaleId);
  if (!originalSale || originalSale.storeId !== storeId) {
    throw new Error('Original sale not found');
  }

  // Check time window
  const saleAge = Date.now() - originalSale.createdAt.getTime();
  const maxAge = REFUND_TIME_WINDOW_HOURS * 60 * 60 * 1000;
  if (saleAge > maxAge) {
    throw new Error(`Refund time window of ${REFUND_TIME_WINDOW_HOURS} hours has expired`);
  }

  // Calculate refund amount
  const amountCents = items.reduce((total, item) => total + item.amountCents, 0);

  // Check if manager approval is required
  const requiresApproval = amountCents >= REFUND_MANAGER_APPROVAL_THRESHOLD_CENTS;
  
  if (requiresApproval && !managerId) {
    // Return pending status, requiring manager approval
    const refundNumber = generateRefundNumber(storeId);
    const id = refundIdCounter++;
    const createdAt = new Date();

    const refundResponse: RefundResponse = {
      id,
      refundNumber,
      amountCents,
      status: 'pending_approval',
      requiresApproval: true,
      createdAt
    };

    refunds.set(id, {
      storeId,
      data: {
        ...refundResponse,
        originalSaleId
      }
    });

    return refundResponse;
  }

  // Process refund
  const refundNumber = generateRefundNumber(storeId);
  const id = refundIdCounter++;
  const createdAt = new Date();

  // In production: Use Prisma transaction to atomically:
  // 1. Create Refund record
  // 2. Update inventory (return items to stock)
  // 3. Create InventoryTransaction for stock movement

  const refundResponse: RefundResponse = {
    id,
    refundNumber,
    amountCents,
    status: 'completed',
    requiresApproval: false,
    createdAt
  };

  refunds.set(id, {
    storeId,
    data: {
      ...refundResponse,
      originalSaleId
    }
  });

  return refundResponse;
};

// UC-C4: Print Invoice
export const printInvoice = async (
  storeId: number,
  invoiceId: number,
  _printData: PrintRequest
): Promise<PrintResponse> => {
  // Validate invoice exists
  const sale = sales.get(invoiceId);
  if (!sale || sale.storeId !== storeId) {
    throw new Error('Invoice not found');
  }

  const printJobId = printJobIdCounter++;
  const printedAt = new Date();

  const printResponse: PrintResponse = {
    printJobId,
    invoiceId,
    printedAt,
    status: 'printed'
  };

  // Log print job for audit
  printJobs.set(printJobId, printResponse);

  // In production: Create PrintJob record in database for audit trail

  return printResponse;
};

// UC-C6: Inventory Lookup by barcode
export const inventoryLookup = async (
  _storeId: number,
  barcode: string
): Promise<InventoryLookupResponse | null> => {
  // Mock implementation - in production, query database
  // Look up product by barcode/SKU, then get inventory for store
  
  // If no record found, return with qty = 0 as per edge case requirement
  if (!barcode) {
    return null;
  }

  // Generate a deterministic product ID based on barcode for consistent mock data
  const productId = barcode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000 + 1;
  
  // Mock response - would query Product and InventoryRecord tables
  // In production: query Product by SKU/barcode, then InventoryRecord for the store
  return {
    productId,
    sku: barcode,
    name: `Product ${barcode}`,
    barcode,
    quantity: 0, // Return 0 if no inventory record exists
    priceCents: productId * 10 // Mock price based on product ID
  };
};

// Utility: Get sales for testing
export const getSale = (saleId: number) => sales.get(saleId);

// Utility: Clear all data (for testing)
export const clearAllData = () => {
  heldCarts.clear();
  sales.clear();
  refunds.clear();
  printJobs.clear();
  holdIdCounter = 1;
  saleIdCounter = 1;
  refundIdCounter = 1;
  printJobIdCounter = 1;
};
