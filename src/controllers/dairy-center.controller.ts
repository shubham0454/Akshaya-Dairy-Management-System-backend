import { Response } from 'express';
import { UserModel } from '../models/User.model';
import { DairyCenterModel } from '../models/DairyCenter.model';
import { ActivityLogModel } from '../models/ActivityLog.model';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

// Helper function to convert MongoDB document to plain object with id
function toPlainObject(doc: any, idField: string = 'id'): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj[idField] = obj._id?.toString() || obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

export class DairyCenterController {
  async createCenter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can create centers' });
        return;
      }

      const { dairy_name, contact_mobile, email, password, address, first_name, last_name } = req.body;

      // Create user first
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      const user = await UserModel.create({
        mobile_no: contact_mobile,
        email: email || null,
        password: hashedPassword,
        role: 'vendor',
        first_name: first_name || dairy_name,
        last_name: last_name || '',
        is_active: true,
        is_verified: true,
      });

      // Create center
      const qrCode = `DC-${uuidv4().substring(0, 8).toUpperCase()}`;
      const center = await DairyCenterModel.create({
        user_id: user._id,
        dairy_name,
        contact_mobile,
        address: address || {},
        qr_code: qrCode,
        is_active: true,
        created_by: new mongoose.Types.ObjectId(req.user.userId),
      });

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(req.user.userId),
        action: 'create_dairy_center',
        entity_type: 'dairy_center',
        entity_id: center._id.toString(),
        description: `Created dairy center: ${dairy_name}`,
        new_values: toPlainObject(center),
      });

      res.status(201).json({
        success: true,
        message: 'Dairy center created successfully',
        data: { ...toPlainObject(center), user: toPlainObject(user) },
      });
    } catch (error: any) {
      logger.error('Create center error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create dairy center',
      });
    }
  }

  async updateCenter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can update centers' });
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      const center = await DairyCenterModel.findByIdAndUpdate(
        id,
        {
          ...updateData,
          modified_by: new mongoose.Types.ObjectId(req.user.userId),
        },
        { new: true }
      );

      if (!center) {
        res.status(404).json({ success: false, message: 'Dairy center not found' });
        return;
      }

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(req.user.userId),
        action: 'update_dairy_center',
        entity_type: 'dairy_center',
        entity_id: center._id.toString(),
        description: `Updated dairy center: ${center.dairy_name}`,
        new_values: toPlainObject(center),
      });

      res.json({
        success: true,
        message: 'Dairy center updated successfully',
        data: center,
      });
    } catch (error: any) {
      logger.error('Update center error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update dairy center',
      });
    }
  }

  async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can toggle center status' });
        return;
      }

      const { id } = req.params;
      const center = await DairyCenterModel.findById(id);

      if (!center) {
        res.status(404).json({ success: false, message: 'Dairy center not found' });
        return;
      }

      center.is_active = !center.is_active;
      (center as any).modified_by = new mongoose.Types.ObjectId(req.user.userId);
      await center.save();

      // Also update user status
      await UserModel.findByIdAndUpdate(String(center.user_id), { is_active: center.is_active });

      res.json({
        success: true,
        message: `Center ${center.is_active ? 'activated' : 'deactivated'} successfully`,
        data: toPlainObject(center),
      });
    } catch (error: any) {
      logger.error('Toggle center status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle center status',
      });
    }
  }

  async getAllCenters(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can view all centers' });
        return;
      }

      const centers = await DairyCenterModel.find()
        .populate('user_id', 'first_name last_name email mobile_no', UserModel)
        .sort({ created_at: -1 });
      
      const centersWithUser = centers.map(center => {
        const obj = toPlainObject(center);
        const user = center.user_id as any;
        if (user) {
          obj.first_name = user.first_name;
          obj.last_name = user.last_name;
          obj.email = user.email;
          obj.user_mobile = user.mobile_no;
        }
        return obj;
      });

      res.json({
        success: true,
        data: centersWithUser,
      });
    } catch (error: any) {
      logger.error('Get all centers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch centers',
      });
    }
  }

  async getCenterById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const center = await DairyCenterModel.findById(id)
        .populate('user_id', 'first_name last_name email mobile_no', UserModel);

      if (!center) {
        res.status(404).json({ success: false, message: 'Dairy center not found' });
        return;
      }

      const obj = toPlainObject(center);
      const user = center.user_id as any;
      if (user) {
        obj.first_name = user.first_name;
        obj.last_name = user.last_name;
        obj.email = user.email;
        obj.user_mobile = user.mobile_no;
      }

      res.json({
        success: true,
        data: obj,
      });
    } catch (error: any) {
      logger.error('Get center by id error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch center',
      });
    }
  }
}

export default new DairyCenterController();

