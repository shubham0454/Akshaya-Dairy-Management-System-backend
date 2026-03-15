import mongoose, { Schema, Document } from 'mongoose';
import { DriverDutyLog } from './types';

export interface IDriverDutyLog extends Omit<DriverDutyLog, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const DriverDutyLogSchema = new Schema(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    duty_date: { type: Date, required: true, index: true },
    shift: { type: String, enum: ['morning', 'evening'], required: true },
    is_on_duty: { type: Boolean, default: false },
    duty_started_at: Date,
    duty_ended_at: Date,
    notes: String,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'driver_duty_logs',
  }
);

// Compound index for efficient queries
DriverDutyLogSchema.index({ driver_id: 1, duty_date: 1, shift: 1 }, { unique: true });
DriverDutyLogSchema.index({ driver_id: 1, duty_date: 1 });

export const DriverDutyLogModel = mongoose.model<IDriverDutyLog>('DriverDutyLog', DriverDutyLogSchema);

