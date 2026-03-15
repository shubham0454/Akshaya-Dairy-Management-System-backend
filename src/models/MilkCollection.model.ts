import mongoose, { Schema, Document } from 'mongoose';
import { MilkCollection, CollectionTime, MilkType, CollectionStatus } from './types';

export interface IMilkCollection extends Omit<MilkCollection, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const MilkCollectionSchema = new Schema(
  {
    vendor_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', required: true, index: true },
    driver_id: { type: Schema.Types.ObjectId, ref: 'Driver', index: true },
    center_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', required: true, index: true },
    collection_code: { type: String, required: true, unique: true, index: true },
    collection_date: { type: Date, required: true, index: true },
    collection_time: { type: String, enum: Object.values(CollectionTime), required: true },
    milk_type: { type: String, enum: Object.values(MilkType), required: true },
    milk_weight: { type: Number, required: true },
    base_value: Number,
    fat_percentage: Number,
    snf_percentage: Number,
    rate_per_liter: { type: Number, required: true },
    total_amount: { type: Number, required: true },
    net_price: Number,
    old_base_price: Number,
    old_net_price: Number,
    can_number: String,
    can_weight_kg: Number,
    quality_notes: String,
    status: { type: String, enum: Object.values(CollectionStatus), default: CollectionStatus.COLLECTED },
    is_synced: { type: Boolean, default: true },
    collected_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'milk_collections',
  }
);

// Compound indexes for efficient queries
MilkCollectionSchema.index({ center_id: 1, collection_date: 1, collection_time: 1, milk_type: 1 });
MilkCollectionSchema.index({ vendor_id: 1, collection_date: 1 });
MilkCollectionSchema.index({ driver_id: 1, collection_date: 1 });
MilkCollectionSchema.index({ collection_date: 1, status: 1 });

export const MilkCollectionModel = mongoose.model<IMilkCollection>('MilkCollection', MilkCollectionSchema);

