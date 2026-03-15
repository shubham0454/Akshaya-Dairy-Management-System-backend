import mongoose, { Schema, Document } from 'mongoose';
import { Driver } from './types';

export interface IDriver extends Omit<Driver, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const DriverSchema = new Schema(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    center_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', index: true },
    aadhar_card: Schema.Types.Mixed,
    pan_card: Schema.Types.Mixed,
    license_number: String,
    license_expiry: Date,
    vehicle_number: String,
    vehicle_type: String,
    salary_per_month: Number,
    joining_date: Date,
    is_on_duty: { type: Boolean, default: false, index: true },
    emergency_contact_name: String,
    emergency_contact_mobile: String,
    additional_info: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'drivers',
  }
);

export const DriverModel = mongoose.model<IDriver>('Driver', DriverSchema);

