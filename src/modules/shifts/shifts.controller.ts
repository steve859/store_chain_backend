import { Request, Response, NextFunction } from 'express';
import * as shiftsService from './shifts.service';
import { OpenShiftRequest, CloseShiftRequest } from './shifts.types';

// UC-C5: Open Shift
export const openShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const shiftData: OpenShiftRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!shiftData.cashierId) {
      res.status(400).json({ error: 'Cashier ID is required' });
      return;
    }

    const result = await shiftsService.openShift(storeId, shiftData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
      return;
    }
    next(error);
  }
};

// UC-C5: Close Shift
export const closeShift = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = parseInt(req.params.storeId, 10);
    const shiftData: CloseShiftRequest = req.body;

    if (!storeId || isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store ID' });
      return;
    }

    if (!shiftData.cashierId) {
      res.status(400).json({ error: 'Cashier ID is required' });
      return;
    }

    if (shiftData.closingCash === undefined || shiftData.closingCash === null) {
      res.status(400).json({ error: 'Closing cash amount is required' });
      return;
    }

    const result = await shiftsService.closeShift(storeId, shiftData);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('No open shift')) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
};
