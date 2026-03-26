import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { AnnualBonusModel } from '../models/AnnualBonus.model';
import { UserModel } from '../models/User.model';
import { UserRole } from '../models/types';
import logger from '../utils/logger';
import mongoose from 'mongoose';

const router = Router();
router.use(authenticate);

// GET all annual bonuses (admin) or own bonuses (driver)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const filter: any = {};
    if (req.user.role === UserRole.DRIVER) {
      filter.driver_id = new mongoose.Types.ObjectId(req.user.userId);
    } else if (req.query.driver_id) {
      filter.driver_id = new mongoose.Types.ObjectId(req.query.driver_id as string);
    }
    if (req.query.year) filter.year = parseInt(req.query.year as string);
    if (req.query.status) filter.status = req.query.status;

    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const bonuses = await AnnualBonusModel.find(filter)
      .populate('driver_id', 'first_name last_name mobile_no')
      .sort({ year: -1, created_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await AnnualBonusModel.countDocuments(filter);

    res.json({
      success: true,
      data: bonuses.map(b => ({
        ...b,
        id: b._id.toString(),
        driver_id: b.driver_id?.toString(),
      })),
      total,
    });
  } catch (error: any) {
    logger.error('Get annual bonuses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch annual bonuses' });
  }
});

// POST create annual bonus (admin only)
router.post('/', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { driver_id, year, bonus_amount, notes } = req.body;

    if (!driver_id || !year || bonus_amount === undefined) {
      res.status(400).json({ success: false, message: 'driver_id, year, and bonus_amount are required' });
      return;
    }
    if (isNaN(Number(bonus_amount)) || Number(bonus_amount) < 0) {
      res.status(400).json({ success: false, message: 'bonus_amount must be a non-negative number' });
      return;
    }

    const driverExists = await UserModel.findById(driver_id);
    if (!driverExists || driverExists.role !== UserRole.DRIVER) {
      res.status(404).json({ success: false, message: 'Driver not found' });
      return;
    }

    const bonus = await AnnualBonusModel.create({
      driver_id: new mongoose.Types.ObjectId(driver_id),
      year: parseInt(year),
      bonus_amount: parseFloat(bonus_amount),
      notes,
      status: 'pending',
      created_by: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Annual bonus created successfully',
      data: { ...bonus.toObject(), id: bonus._id.toString() },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, message: 'A bonus for this driver and year already exists' });
      return;
    }
    logger.error('Create annual bonus error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create annual bonus' });
  }
});

// PATCH update bonus status (admin only)
router.patch('/:id/status', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { status, transaction_id, payment_method } = req.body;
    const validStatuses = ['pending', 'approved', 'paid', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const update: any = {
      status,
      modified_by: req.user ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
    };
    if (status === 'paid') {
      update.paid_at = new Date();
      if (transaction_id) update.transaction_id = transaction_id;
      if (payment_method) update.payment_method = payment_method;
    }

    const bonus = await AnnualBonusModel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!bonus) {
      res.status(404).json({ success: false, message: 'Annual bonus not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Annual bonus status updated',
      data: { ...bonus.toObject(), id: bonus._id.toString() },
    });
  } catch (error: any) {
    logger.error('Update annual bonus status error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update status' });
  }
});

// DELETE bonus (admin only)
router.delete('/:id', authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const bonus = await AnnualBonusModel.findByIdAndDelete(req.params.id);
    if (!bonus) {
      res.status(404).json({ success: false, message: 'Annual bonus not found' });
      return;
    }
    res.json({ success: true, message: 'Annual bonus deleted' });
  } catch (error: any) {
    logger.error('Delete annual bonus error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete annual bonus' });
  }
});

export default router;
