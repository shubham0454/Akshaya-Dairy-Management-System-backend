import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  old_values?: any;
  new_values?: any;
  created_at: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    entity_type: { type: String, required: true, index: true },
    entity_id: { type: String, required: true, index: true },
    description: { type: String, required: true },
    old_values: Schema.Types.Mixed,
    new_values: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
  },
  {
    collection: 'activity_logs',
  }
);

ActivityLogSchema.index({ user_id: 1, created_at: -1 });
ActivityLogSchema.index({ entity_type: 1, entity_id: 1 });

export const ActivityLogModel = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

