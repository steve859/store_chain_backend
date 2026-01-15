import { Router } from 'express';
import { StoreService } from './stores.service';

const router = Router();

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    const stores = await StoreService.getAllStores();
    res.json(stores);
  } catch (error) {
    // SỬA LỖI: Bỏ ': any' và ép kiểu (error as Error) khi dùng
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/stores/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id; // ID là string (UUID)
    const store = await StoreService.getStoreById(id);
    res.json(store);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// POST /api/stores
router.post('/', async (req, res) => {
  try {
    const newStore = await StoreService.createStore(req.body);
    res.status(201).json(newStore);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/stores/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedStore = await StoreService.updateStore(id, req.body);
    res.json(updatedStore);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/stores/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await StoreService.deleteStore(id);
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    // Trả về 409 Conflict nếu vi phạm ràng buộc khóa ngoại
    res.status(409).json({ error: (error as Error).message });
  }
});

export default router;