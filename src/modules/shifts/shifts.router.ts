import { Router } from 'express';
import * as shiftsController from './shifts.controller';

const router = Router({ mergeParams: true });

// UC-C5: Open Shift
// POST /api/v1/stores/:storeId/shifts/open
router.post('/open', shiftsController.openShift);

// UC-C5: Close Shift
// POST /api/v1/stores/:storeId/shifts/close
router.post('/close', shiftsController.closeShift);

export default router;
