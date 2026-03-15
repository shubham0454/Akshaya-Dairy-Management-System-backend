import { Response } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/types';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.model';
import { DriverModel } from '../models/Driver.model';
import { DriverCenterAssignmentModel } from '../models/DriverCenterAssignment.model';
import driverService from '../services/driver.service';

function toPlain(doc: any): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id?.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

export class DriverAdminController {
  async createDriver(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can create drivers' });
        return;
      }

      const {
        mobile_no,
        email,
        password,
        first_name,
        last_name,
        center_id,
        license_number,
        license_expiry,
        vehicle_number,
        vehicle_type,
        salary_per_month,
        joining_date,
        emergency_contact_name,
        emergency_contact_mobile,
      } = req.body;

      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      const user = await UserModel.create({
        mobile_no,
        email: email || undefined,
        password: hashedPassword,
        role: UserRole.DRIVER,
        first_name,
        last_name,
        is_active: true,
        is_verified: true,
        created_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      });

      const driver = await DriverModel.create({
        driver_id: user._id,
        center_id: center_id ? new mongoose.Types.ObjectId(center_id) : undefined,
        license_number,
        license_expiry: license_expiry ? new Date(license_expiry) : undefined,
        vehicle_number,
        vehicle_type,
        salary_per_month: salary_per_month ?? 0,
        joining_date: joining_date ? new Date(joining_date) : new Date(),
        is_on_duty: false,
        emergency_contact_name,
        emergency_contact_mobile,
        created_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
      });

      if (center_id) {
        await DriverCenterAssignmentModel.create({
          driver_id: driver._id,
          center_id: new mongoose.Types.ObjectId(center_id),
          is_active: true,
          assigned_at: new Date(),
          created_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        });
      }

      const driverObj = toPlain(driver);
      const userObj = toPlain(user);
      delete userObj.password;
      res.status(201).json({
        success: true,
        message: 'Driver created successfully',
        data: { ...driverObj, user: userObj },
      });
    } catch (error: any) {
      logger.error('Create driver error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create driver',
      });
    }
  }

  async updateDriver(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can update drivers' });
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      const driver = await DriverModel.findByIdAndUpdate(
        id,
        {
          ...updateData,
          modified_at: new Date(),
          modified_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        },
        { new: true }
      );

      if (!driver) {
        res.status(404).json({ success: false, message: 'Driver not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Driver updated successfully',
        data: toPlain(driver),
      });
    } catch (error: any) {
      logger.error('Update driver error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update driver',
      });
    }
  }

  async toggleDriverDuty(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can toggle driver duty' });
        return;
      }

      const { id } = req.params;
      const driver = await DriverModel.findById(id);

      if (!driver) {
        res.status(404).json({ success: false, message: 'Driver not found' });
        return;
      }

      const updated = await driverService.updateDutyStatusByDriverId(
        id,
        !driver.is_on_duty,
        req.user.userId
      );

      res.json({
        success: true,
        message: `Driver ${updated.is_on_duty ? 'set to on-duty' : 'set to off-duty'}`,
        data: updated,
      });
    } catch (error: any) {
      logger.error('Toggle driver duty error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle driver duty',
      });
    }
  }

  async toggleDriverStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can toggle driver status' });
        return;
      }

      const { id } = req.params;
      const driver = await DriverModel.findById(id).populate('driver_id');

      if (!driver) {
        res.status(404).json({ success: false, message: 'Driver not found' });
        return;
      }

      const user = driver.driver_id as any;
      if (!user) {
        res.status(404).json({ success: false, message: 'Driver user not found' });
        return;
      }

      const newStatus = !user.is_active;
      await UserModel.findByIdAndUpdate(user._id, { is_active: newStatus });

      res.json({
        success: true,
        message: `Driver ${newStatus ? 'activated' : 'deactivated'} successfully`,
        data: { is_active: newStatus },
      });
    } catch (error: any) {
      logger.error('Toggle driver status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to toggle driver status',
      });
    }
  }

  async assignCenter(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can assign centers' });
        return;
      }

      const { id } = req.params;
      const { center_id } = req.body;

      const driver = await DriverModel.findById(id);
      if (!driver) {
        res.status(404).json({ success: false, message: 'Driver not found' });
        return;
      }

      await DriverCenterAssignmentModel.updateMany(
        { driver_id: driver._id, is_active: true },
        { is_active: false, modified_at: new Date() }
      );

      if (center_id) {
        await DriverCenterAssignmentModel.create({
          driver_id: driver._id,
          center_id: new mongoose.Types.ObjectId(center_id),
          is_active: true,
          assigned_at: new Date(),
          created_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        });
        await DriverModel.findByIdAndUpdate(id, {
          center_id: new mongoose.Types.ObjectId(center_id),
          modified_at: new Date(),
        });
      }

      res.json({
        success: true,
        message: 'Center assigned successfully',
      });
    } catch (error: any) {
      logger.error('Assign center error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to assign center',
      });
    }
  }
}

export default new DriverAdminController();
