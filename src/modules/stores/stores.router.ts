import { Router } from 'express';
import prisma from '../../db/prisma';
import { Prisma } from '../../generated/prisma';

const router = Router();

const buildNextStoreCode = async (): Promise<string> => {
  const result = await prisma.stores.aggregate({
    _max: { id: true },
  });
  const nextId = (result._max.id ?? 0) + 1;
  return `SHP-${String(nextId).padStart(3, '0')}`;
};

/**
 * UC-S1: Store list
 * GET /api/v1/stores?take=50&skip=0&q=q1
 */
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const take = req.query.take ? Math.min(Number(req.query.take), 200) : 50;
    const skip = req.query.skip ? Number(req.query.skip) : 0;

    const where: Prisma.storesWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.stores.findMany({
        where,
        orderBy: { id: 'desc' },
        take,
        skip,
      }),
      prisma.stores.count({ where }),
    ]);

    return res.json({ items, total, take, skip });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-S1: Store details
 * GET /api/v1/stores/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isFinite(storeId)) {
      return res.status(400).json({ error: 'Invalid store id' });
    }

    const store = await prisma.stores.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    return res.json({ store });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-S1: Create store
 * POST /api/v1/stores
 * Body: { code?: string, name: string, address?: string, phone?: string, timezone?: string, isActive?: boolean }
 */
router.post('/', async (req, res, next) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = body.name !== undefined && body.name !== null ? String(body.name).trim() : '';
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const codeProvided = body.code !== undefined && body.code !== null && String(body.code).trim() !== '' ? String(body.code).trim() : null;
    const code = codeProvided ?? (await buildNextStoreCode());

    const created = await prisma.stores.create({
      data: {
        code,
        name,
        address: body.address !== undefined && body.address !== null && String(body.address).trim() !== '' ? String(body.address) : null,
        phone: body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '' ? String(body.phone) : null,
        timezone: body.timezone !== undefined && body.timezone !== null && String(body.timezone).trim() !== '' ? String(body.timezone) : undefined,
        is_active: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return res.status(201).json({ store: created });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-S1: Update store
 * PUT /api/v1/stores/:id
 */
router.put('/:id', async (req, res, next) => {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isFinite(storeId)) {
      return res.status(400).json({ error: 'Invalid store id' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const data: Prisma.storesUpdateInput = {};
    if (body.code !== undefined) data.code = String(body.code);
    if (body.name !== undefined) data.name = String(body.name);
    if (body.address !== undefined) data.address = body.address === null || String(body.address).trim() === '' ? null : String(body.address);
    if (body.phone !== undefined) data.phone = body.phone === null || String(body.phone).trim() === '' ? null : String(body.phone);
    if (body.timezone !== undefined) data.timezone = body.timezone === null || String(body.timezone).trim() === '' ? null : String(body.timezone);
    if (body.isActive !== undefined) data.is_active = Boolean(body.isActive);

    const updated = await prisma.stores.update({
      where: { id: storeId },
      data,
    });

    return res.json({ store: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * UC-S1: Deactivate store (soft delete)
 * DELETE /api/v1/stores/:id
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const storeId = Number(req.params.id);
    if (!Number.isFinite(storeId)) {
      return res.status(400).json({ error: 'Invalid store id' });
    }

    const updated = await prisma.stores.update({
      where: { id: storeId },
      data: { is_active: false },
    });

    return res.json({ store: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
