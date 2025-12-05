import { Router, Request, Response } from 'express';

const router = Router({ mergeParams: true });

// Define param types for merged params
interface StoreParams {
  storeId: string;
}

interface StoreUserParams extends StoreParams {
  userId: string;
}

interface StoreUserShiftParams extends StoreUserParams {
  shiftId: string;
}

/**
 * UC-M5 — Store Employee/User Management
 * Description: Assign cashier, create shifts
 * Edge Cases: Shift close requires reconciliation
 */

// GET /api/v1/stores/:storeId/users - List users assigned to store
router.get('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { role, isActive } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    items: [],
    total: 0,
    filters: {
      role: role || undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    }
  });
});

// GET /api/v1/stores/:storeId/users/:userId - Get specific user
router.get('/:userId', (req: Request<StoreUserParams>, res: Response) => {
  const { storeId, userId } = req.params;

  res.json({
    id: parseInt(userId, 10),
    storeId: parseInt(storeId, 10),
    username: 'user@example.com',
    role: 'cashier',
    isActive: true,
    shifts: []
  });
});

// POST /api/v1/stores/:storeId/users - Assign user to store
router.post('/', (req: Request<StoreParams>, res: Response) => {
  const { storeId } = req.params;
  const { userId, role } = req.body;

  // Validation
  if (!userId || typeof userId !== 'number') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!role || !['manager', 'cashier', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (manager, cashier, staff)' });
  }

  res.status(201).json({
    message: 'User assigned to store successfully',
    assignment: {
      userId,
      storeId: parseInt(storeId, 10),
      role,
      assignedAt: new Date().toISOString()
    },
    audit: {
      action: 'ASSIGN_USER_TO_STORE',
      timestamp: new Date().toISOString()
    }
  });
});

// PUT /api/v1/stores/:storeId/users/:userId - Update user role in store
router.put('/:userId', (req: Request<StoreUserParams>, res: Response) => {
  const { storeId, userId } = req.params;
  const { role, isActive } = req.body;

  res.json({
    message: 'User updated successfully',
    user: {
      id: parseInt(userId, 10),
      storeId: parseInt(storeId, 10),
      role: role || 'cashier',
      isActive: isActive !== undefined ? isActive : true
    },
    audit: {
      action: 'UPDATE_STORE_USER',
      timestamp: new Date().toISOString()
    }
  });
});

// DELETE /api/v1/stores/:storeId/users/:userId - Remove user from store
router.delete('/:userId', (req: Request<StoreUserParams>, res: Response) => {
  const { storeId, userId } = req.params;

  res.json({
    message: 'User removed from store',
    userId: parseInt(userId, 10),
    storeId: parseInt(storeId, 10),
    audit: {
      action: 'REMOVE_USER_FROM_STORE',
      timestamp: new Date().toISOString()
    }
  });
});

// --- SHIFT MANAGEMENT ---

// GET /api/v1/stores/:storeId/users/:userId/shifts - Get user shifts
router.get('/:userId/shifts', (req: Request<StoreUserParams>, res: Response) => {
  const { storeId, userId } = req.params;
  const { from, to, status } = req.query;

  res.json({
    storeId: parseInt(storeId, 10),
    userId: parseInt(userId, 10),
    shifts: [],
    total: 0,
    filters: {
      from: from || undefined,
      to: to || undefined,
      status: status || undefined
    }
  });
});

// POST /api/v1/stores/:storeId/users/:userId/shifts - Create shift for user
router.post('/:userId/shifts', (req: Request<StoreUserParams>, res: Response) => {
  const { storeId, userId } = req.params;
  const { startTime, endTime } = req.body;

  if (!startTime) {
    return res.status(400).json({ error: 'Start time is required' });
  }

  res.status(201).json({
    message: 'Shift created successfully',
    shift: {
      id: 1,
      userId: parseInt(userId, 10),
      storeId: parseInt(storeId, 10),
      startTime,
      endTime: endTime || null,
      status: 'scheduled',
      reconciliation: null
    },
    audit: {
      action: 'CREATE_SHIFT',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/v1/stores/:storeId/users/:userId/shifts/:shiftId/close - Close shift
router.post('/:userId/shifts/:shiftId/close', (req: Request<StoreUserShiftParams>, res: Response) => {
  const { storeId, userId, shiftId } = req.params;
  const { cashCount, notes } = req.body;

  // Shift close requires reconciliation
  if (cashCount === undefined || typeof cashCount !== 'number') {
    return res.status(400).json({ 
      error: 'Cash count reconciliation is required to close shift' 
    });
  }

  res.json({
    message: 'Shift closed successfully',
    shift: {
      id: parseInt(shiftId, 10),
      userId: parseInt(userId, 10),
      storeId: parseInt(storeId, 10),
      status: 'closed',
      closedAt: new Date().toISOString(),
      reconciliation: {
        cashCount,
        expectedCash: 0,
        variance: 0,
        notes: notes || null
      }
    },
    audit: {
      action: 'CLOSE_SHIFT',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
