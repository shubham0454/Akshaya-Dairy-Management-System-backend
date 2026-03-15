import mongoose, { Schema, Document } from 'mongoose';
import { Notification } from './types';

export interface INotification extends Omit<Notification, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    user_role: { type: String, enum: ['admin', 'driver', 'vendor', 'all'], required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    is_read: { type: Boolean, default: false, index: true },
    metadata: Schema.Types.Mixed,
    read_at: Date,
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: 'notifications',
  }
);

NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ user_role: 1, is_read: 1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);

