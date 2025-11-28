import { Router } from 'express';

const router = Router();

// GET /api/v1/stores
router.get('/', (_req, res) => {
  res.json({ items: [], total: 0 });
});

// GET /api/v1/stores/:id
router.get('/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Store Name', address: 'TBD' });
});

// POST /api/v1/stores
router.post('/', (_req, res) => {
  res.status(501).json({ message: 'Not Implemented' });
});

export default router;
