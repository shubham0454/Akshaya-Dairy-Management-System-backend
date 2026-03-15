import mongoose, { Schema, Document } from 'mongoose';
import { DairyCenter } from './types';

export interface IDairyCenter extends Omit<DairyCenter, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const DairyCenterSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dairy_name: { type: String, required: true },
    address: Schema.Types.Mixed,
    contact_mobile: String,
    is_active: { type: Boolean, default: true, index: true },
    center_image: Schema.Types.Mixed,
    qr_code: String,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'dairy_centers',
  }
);

export const DairyCenterModel = mongoose.model<IDairyCenter>('DairyCenter', DairyCenterSchema);

