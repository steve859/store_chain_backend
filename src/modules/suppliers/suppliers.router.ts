import { Router } from 'express';
import { SuppliersService } from './suppliers.service';

const router = Router();

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await SuppliersService.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/suppliers/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id; // Không cần parseInt
    const supplier = await SuppliersService.getSupplierById(id);
    res.json(supplier);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    if (!req.body.name || !req.body.phone) {
      return res.status(400).json({ error: 'Name and Phone are required' });
    }
    const newSupplier = await SuppliersService.createSupplier(req.body);
    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedSupplier = await SuppliersService.updateSupplier(id, req.body);
    res.json(updatedSupplier);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await SuppliersService.deleteSupplier(id);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;