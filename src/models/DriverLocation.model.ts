import mongoose, { Schema, Document } from 'mongoose';
import { DriverLocation } from './types';

export interface IDriverLocation extends Omit<DriverLocation, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const DriverLocationSchema = new Schema(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: Number,
    speed: Number,
    address: String,
    recorded_at: { type: Date, default: Date.now, index: true },
  },
  {
    collection: 'driver_locations',
  }
);

DriverLocationSchema.index({ driver_id: 1, recorded_at: -1 });

export const DriverLocationModel = mongoose.model<IDriverLocation>('DriverLocation', DriverLocationSchema);

