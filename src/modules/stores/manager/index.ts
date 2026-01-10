import { Router } from 'express';
import productsRouter from './products.router';
import inventoriesRouter from './inventories.router';
import purchaseOrdersRouter from './purchase-orders.router';
import reportsRouter from './reports.router';
import usersRouter from './users.router';
import promotionsRouter from './promotions.router';
import returnsRouter from './returns.router';
import transfersRouter from './transfers.router';

const router = Router({ mergeParams: true });

/**
 * Manager Use Cases Routes
 * All routes are prefixed with /api/v1/stores/:storeId
 * 
 * UC-M1: /products - Product & Variant Management
 * UC-M2: /inventories - Inventory Management (Stock In & Adjust)
 * UC-M3: /purchase-orders - Purchase Order Management
 * UC-M4: /reports - Store Reports
 * UC-M5: /users - Store Employee Management
 * UC-M6: /promotions - Store Promotions
 * UC-M7: /returns - Returns & Refund
 * UC-M8: /transfers - Store Transfers
 */

router.use('/products', productsRouter);
router.use('/inventories', inventoriesRouter);
router.use('/purchase-orders', purchaseOrdersRouter);
router.use('/reports', reportsRouter);
router.use('/users', usersRouter);
router.use('/promotions', promotionsRouter);
router.use('/returns', returnsRouter);
router.use('/transfers', transfersRouter);

export default router;
