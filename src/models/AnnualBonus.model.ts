import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnualBonus extends Document {
  _id: mongoose.Types.ObjectId;
  driver_id: mongoose.Types.ObjectId;
  year: number;
  bonus_amount: number;
  notes?: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paid_at?: Date;
  transaction_id?: string;
  payment_method?: string;
  created_at: Date;
  modified_at: Date;
  created_by?: mongoose.Types.ObjectId;
  modified_by?: mongoose.Types.ObjectId;
}

const AnnualBonusSchema = new Schema<IAnnualBonus>(
  {
    driver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: Number, required: true },
    bonus_amount: { type: Number, required: true, min: 0 },
    notes: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paid_at: { type: Date },
    transaction_id: { type: String },
    payment_method: { type: String },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'annual_bonuses',
  }
);

// Compound index — one bonus record per driver per year
AnnualBonusSchema.index({ driver_id: 1, year: 1 }, { unique: true });

export const AnnualBonusModel = mongoose.model<IAnnualBonus>('AnnualBonus', AnnualBonusSchema);
