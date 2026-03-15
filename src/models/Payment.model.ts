import mongoose, { Schema, Document } from 'mongoose';
import { Payment, PaymentType, PaymentStatus } from './types';

export interface IPayment extends Omit<Payment, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const PaymentSchema = new Schema(
  {
    vendor_id: { type: Schema.Types.ObjectId, ref: 'DairyCenter', required: true, index: true },
    payment_code: { type: String, required: true, unique: true, index: true },
    payment_type: { type: String, enum: Object.values(PaymentType), required: true },
    payment_month: Date,
    total_amount: { type: Number, required: true },
    advance_amount: { type: Number, default: 0 },
    previous_pending: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    final_amount: { type: Number, required: true },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    payment_notes: String,
    transaction_id: String,
    payment_method: String,
    paid_at: Date,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'payments',
  }
);

PaymentSchema.index({ vendor_id: 1, payment_month: 1 });
PaymentSchema.index({ vendor_id: 1, status: 1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);

