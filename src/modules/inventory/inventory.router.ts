import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ items: [], total: 0 });
});

router.get('/:storeId/:productId', (req, res) => {
  const { storeId, productId } = req.params;
  res.json({ storeId, productId, quantity: 0 });
});

router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

export default router;
