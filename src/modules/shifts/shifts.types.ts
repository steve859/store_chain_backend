// Types for Shift operations

export interface OpenShiftRequest {
  cashierId: number;
  openingCash?: number;
  notes?: string;
}

export interface OpenShiftResponse {
  id: number;
  storeId: number;
  cashierId: number;
  openedAt: Date;
  openingCash?: number;
  status: string;
}

export interface CloseShiftRequest {
  cashierId: number;
  closingCash: number;
  notes?: string;
}

export interface CloseShiftResponse {
  id: number;
  storeId: number;
  cashierId: number;
  openedAt: Date;
  closedAt: Date;
  openingCash?: number;
  closingCash: number;
  expectedCash?: number;
  discrepancy?: number;
  status: string;
  discrepancyLogged: boolean;
}

export interface ShiftStatus {
  id: number;
  storeId: number;
  cashierId: number;
  status: string;
  openedAt: Date;
  closedAt?: Date;
}
