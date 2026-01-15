import { Router } from 'express';
import storesRouter from '../modules/stores/stores.router';
import productsRouter from '../modules/products/products.router';
import inventoryRouter from '../modules/inventory/inventory.router';
import ordersRouter from '../modules/orders/orders.router';
import usersRouter from '../modules/users/users.router';
import posRouter from '../modules/pos/pos.router';
import transfersRouter from '../modules/transfers/transfers.router';
import returnsRouter from '../modules/returns/returns.router';

const router = Router();

router.use('/stores', storesRouter);
router.use('/products', productsRouter);
router.use('/inventory', inventoryRouter);
router.use('/orders', ordersRouter);
router.use('/users', usersRouter);
router.use('/pos', posRouter);
router.use('/transfers', transfersRouter);
router.use('/returns', returnsRouter);

export default router;
