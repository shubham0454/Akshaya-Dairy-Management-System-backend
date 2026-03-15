import mongoose, { Schema, Document } from 'mongoose';
import { User, UserRole } from './types';

export interface IUser extends Omit<User, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    mobile_no: { type: String, required: true, unique: true, index: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true, index: true },
    first_name: String,
    last_name: String,
    aadhar_card: String,
    pan_card: String,
    is_active: { type: Boolean, default: true, index: true },
    is_verified: { type: Boolean, default: false },
    date_of_birth: Date,
    profile_image: Schema.Types.Mixed,
    address: Schema.Types.Mixed,
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    modified_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'modified_at' },
    collection: 'users',
  }
);

// Compound index for mobile/email queries
UserSchema.index({ mobile_no: 1, email: 1 });
UserSchema.index({ mobile_no: 1, is_active: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);

