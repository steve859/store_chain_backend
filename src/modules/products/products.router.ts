import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ items: [], total: 0 });
});

router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Product Name', sku: 'SKU-000' });
});

router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

export default router;
