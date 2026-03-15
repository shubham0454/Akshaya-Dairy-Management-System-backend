import mongoose, { Schema, Document } from 'mongoose';

export interface IDriverCenterAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  driver_id: mongoose.Types.ObjectId;
  center_id: mongoose.Types.ObjectId;
  is_active: boolean;
  assigned_at: Date;
  created_at: Date;
  modified_at: Date;
  created_by?: mongoose.Types.ObjectId;
  modified_by?: mongoose.Types.ObjectId;
}

const DriverCenterAssignmentSchema = new Schema<IDriverCenterAssignment>(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    center_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', required: true, index: true },
    is_active: { type: Boolean, default: true, index: true },
    assigned_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'driver_center_assignments',
  }
);

DriverCenterAssignmentSchema.index({ driver_id: 1, center_id: 1, is_active: 1 });

export const DriverCenterAssignmentModel = mongoose.model<IDriverCenterAssignment>('DriverCenterAssignment', DriverCenterAssignmentSchema);

