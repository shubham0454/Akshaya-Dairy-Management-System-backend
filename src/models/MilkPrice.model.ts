import mongoose, { Schema, Document } from 'mongoose';
import { MilkPrice, MilkType } from './types';

export interface IMilkPrice extends Omit<MilkPrice, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const MilkPriceSchema = new Schema<IMilkPrice>(
  {
    price_date: { type: Date, required: true, index: true },
    base_price: { type: Number, required: true },
    base_fat: { type: Number, required: true },
    base_snf: { type: Number, required: true },
    fat_rate: { type: Number, required: true },
    snf_rate: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    milk_type: { type: String, enum: Object.values(MilkType), required: true, index: true },
    is_active: { type: Boolean, default: true, index: true },
    notes: String,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'milk_prices',
  }
);

// Compound index for efficient queries
MilkPriceSchema.index({ price_date: 1, milk_type: 1, is_active: 1 }, { unique: true });

export const MilkPriceModel = mongoose.model<IMilkPrice>('MilkPrice', MilkPriceSchema);

