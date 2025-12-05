// Types for POS operations

export interface CartItem {
  productId: number;
  variantId?: number;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  batchNo?: string;
}

export interface CheckoutRequest {
  items: CartItem[];
  cashierId: number;
  shiftId?: number;
  payments: PaymentInfo[];
  promoCode?: string;
  customerId?: number;
}

export interface PaymentInfo {
  method: 'cash' | 'card' | 'mobile' | 'voucher';
  amountCents: number;
  reference?: string;
}

export interface CheckoutResponse {
  invoiceId: number;
  saleNumber: string;
  totalCents: number;
  items: SaleItemResponse[];
  payments: PaymentInfo[];
  createdAt: Date;
}

export interface SaleItemResponse {
  productId: number;
  productName?: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface HoldCartRequest {
  items: CartItem[];
  cashierId: number;
  expiresInMinutes?: number;
}

export interface HoldCartResponse {
  id: number;
  items: CartItem[];
  expiresAt: Date;
  createdAt: Date;
}

export interface RefundRequest {
  originalSaleId: number;
  cashierId: number;
  items: RefundItem[];
  reason: string;
  managerId?: number;
}

export interface RefundItem {
  productId: number;
  quantity: number;
  amountCents: number;
}

export interface RefundResponse {
  id: number;
  refundNumber: string;
  amountCents: number;
  status: string;
  requiresApproval: boolean;
  createdAt: Date;
}

export interface PrintRequest {
  printedBy: number;
  printType: 'receipt' | 'invoice' | 'duplicate';
}

export interface PrintResponse {
  printJobId: number;
  invoiceId: number;
  printedAt: Date;
  status: string;
}

export interface InventoryLookupResponse {
  productId: number;
  sku: string;
  name: string;
  barcode?: string;
  quantity: number;
  batchNo?: string;
  expiryDate?: Date;
  priceCents?: number;
}
