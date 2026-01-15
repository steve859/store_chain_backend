import { Router } from 'express';
import authRouter from '../modules/auth/auth.router';
import categoriesRouter from '../modules/categories/categories.router';
import storesRouter from '../modules/stores/stores.router';
import productsRouter from '../modules/products/products.router';
import inventoryRouter from '../modules/inventory/inventory.router';
import ordersRouter from '../modules/orders/orders.router';
import promotionsRouter from '../modules/promotions/promotions.router';
import settingsRouter from '../modules/settings/settings.router';
import suppliersRouter from '../modules/suppliers/suppliers.router';
import usersRouter from '../modules/users/users.router';

const router = Router();

router.use('/auth', authRouter);
router.use('/categories', categoriesRouter);
router.use('/stores', storesRouter);
router.use('/products', productsRouter);
router.use('/inventory', inventoryRouter);
router.use('/orders', ordersRouter);
router.use('/promotions', promotionsRouter);
router.use('/settings', settingsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/users', usersRouter);

export default router;
