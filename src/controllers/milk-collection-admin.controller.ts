import { Response } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/types';
import { MilkCollectionModel } from '../models/MilkCollection.model';
import { ActivityLogModel } from '../models/ActivityLog.model';

export class MilkCollectionAdminController {
  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        res.status(403).json({ success: false, message: 'Only admin can update collection status' });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      const collection = await MilkCollectionModel.findByIdAndUpdate(
        id,
        {
          status,
          modified_at: new Date(),
          modified_by: req.user.userId ? new mongoose.Types.ObjectId(req.user.userId) : undefined,
        },
        { new: true }
      );

      if (!collection) {
        res.status(404).json({ success: false, message: 'Collection not found' });
        return;
      }

      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(req.user.userId!),
        action: 'update_collection_status',
        entity_type: 'milk_collection',
        entity_id: collection._id.toString(),
        description: `Updated collection status to ${status}`,
        new_values: collection.toObject(),
      });

      const data = collection.toObject();
      (data as any).id = data._id?.toString();
      delete (data as any)._id;
      delete (data as any).__v;

      res.json({
        success: true,
        message: 'Collection status updated successfully',
        data,
      });
    } catch (error: any) {
      logger.error('Update collection status error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update collection status',
      });
    }
  }
}

export default new MilkCollectionAdminController();
