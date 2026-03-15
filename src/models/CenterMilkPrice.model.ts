import mongoose, { Schema, Document } from 'mongoose';
import { CenterMilkPrice, MilkType } from './types';

export interface ICenterMilkPrice extends Omit<CenterMilkPrice, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const CenterMilkPriceSchema = new Schema(
  {
    center_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', required: true, index: true },
    price_date: { type: Date, required: true, index: true },
    milk_type: { type: String, enum: Object.values(MilkType), required: true },
    base_price: { type: Number, required: true },
    net_price: Number,
    old_base_price: Number,
    old_net_price: Number,
    base_fat: { type: Number, required: true },
    base_snf: { type: Number, required: true },
    fat_rate: { type: Number, required: true },
    snf_rate: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    notes: String,
    is_active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'center_milk_prices',
  }
);

// Compound index for efficient queries
CenterMilkPriceSchema.index({ center_id: 1, price_date: 1, milk_type: 1, is_active: 1 }, { unique: true });

export const CenterMilkPriceModel = mongoose.model<ICenterMilkPrice>('CenterMilkPrice', CenterMilkPriceSchema);

