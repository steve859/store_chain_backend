import {
  OpenShiftRequest,
  OpenShiftResponse,
  CloseShiftRequest,
  CloseShiftResponse
} from './shifts.types';

// In-memory storage for mock implementation
const shifts: Map<number, {
  id: number;
  storeId: number;
  cashierId: number;
  openedAt: Date;
  closedAt?: Date;
  openingCash?: number;
  closingCash?: number;
  expectedCash?: number;
  discrepancy?: number;
  status: string;
  notes?: string;
}> = new Map();

let shiftIdCounter = 1;

// Check for overlapping shifts
const hasOverlappingShift = (storeId: number, cashierId: number): boolean => {
  for (const shift of shifts.values()) {
    if (shift.storeId === storeId && 
        shift.cashierId === cashierId && 
        shift.status === 'open') {
      return true;
    }
  }
  return false;
};

// Get active shift for a cashier at a store
export const getActiveShift = (storeId: number, cashierId: number) => {
  for (const shift of shifts.values()) {
    if (shift.storeId === storeId && 
        shift.cashierId === cashierId && 
        shift.status === 'open') {
      return shift;
    }
  }
  return null;
};

// UC-C5: Open Shift
export const openShift = async (
  storeId: number,
  shiftData: OpenShiftRequest
): Promise<OpenShiftResponse> => {
  const { cashierId, openingCash, notes } = shiftData;

  // Prevent overlapping shifts
  if (hasOverlappingShift(storeId, cashierId)) {
    throw new Error('An open shift already exists for this cashier at this store');
  }

  const id = shiftIdCounter++;
  const openedAt = new Date();

  const shift = {
    id,
    storeId,
    cashierId,
    openedAt,
    openingCash,
    status: 'open',
    notes
  };

  shifts.set(id, shift);

  // In production: Create Shift record in database via Prisma

  return {
    id,
    storeId,
    cashierId,
    openedAt,
    openingCash,
    status: 'open'
  };
};

// UC-C5: Close Shift
export const closeShift = async (
  storeId: number,
  shiftData: CloseShiftRequest
): Promise<CloseShiftResponse> => {
  const { cashierId, closingCash, notes } = shiftData;

  // Find open shift for this cashier
  const activeShift = getActiveShift(storeId, cashierId);
  
  if (!activeShift) {
    throw new Error('No open shift found for this cashier at this store');
  }

  const closedAt = new Date();

  // Calculate expected cash (in production, sum of cash transactions during shift)
  // For mock, we'll use opening cash + some mock value
  const expectedCash = activeShift.openingCash || 0;
  const discrepancy = closingCash - expectedCash;

  // Update shift
  activeShift.closedAt = closedAt;
  activeShift.closingCash = closingCash;
  activeShift.expectedCash = expectedCash;
  activeShift.discrepancy = discrepancy;
  activeShift.status = 'closed';
  if (notes) {
    activeShift.notes = notes;
  }

  // Log discrepancy if any
  const discrepancyLogged = discrepancy !== 0;
  if (discrepancyLogged) {
    // In production: Create AuditLog entry for cash discrepancy via Prisma
    // Example: await prisma.auditLog.create({
    //   data: {
    //     actorId: cashierId,
    //     action: 'CASH_DISCREPANCY',
    //     objectType: 'shift',
    //     objectId: String(activeShift.id),
    //     oldValue: { expected: expectedCash },
    //     newValue: { actual: closingCash, discrepancy }
    //   }
    // });
  }

  // In production: Update Shift record in database via Prisma

  return {
    id: activeShift.id,
    storeId,
    cashierId,
    openedAt: activeShift.openedAt,
    closedAt,
    openingCash: activeShift.openingCash,
    closingCash,
    expectedCash,
    discrepancy,
    status: 'closed',
    discrepancyLogged
  };
};

// Get shift by ID
export const getShift = (shiftId: number) => shifts.get(shiftId);

// Clear all data (for testing)
export const clearAllData = () => {
  shifts.clear();
  shiftIdCounter = 1;
};
