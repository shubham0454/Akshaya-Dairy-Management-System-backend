import { PaymentModel, IPayment } from '../models/Payment.model';
import { NotificationModel } from '../models/Notification.model';
import { MilkCollectionModel } from '../models/MilkCollection.model';
import { Payment, PaymentType, PaymentStatus } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import mongoose from 'mongoose';

// Helper function to convert MongoDB document to plain object with id
function toPlainObject(doc: any, idField: string = 'id'): any {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj[idField] = obj._id?.toString() || obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

export class PaymentService {
  async calculateMonthlyPayment(
    vendorId: string,
    month: Date
  ): Promise<{
    totalMilkAmount: number;
    advanceAmount: number;
    previousPending: number;
    deductions: number;
    finalAmount: number;
  }> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Calculate total milk collection amount for the month
    const milkCollections = await MilkCollectionModel.aggregate([
      {
        $match: {
          vendor_id: new mongoose.Types.ObjectId(vendorId),
          collection_date: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'rejected' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_amount' }
        }
      }
    ]);

    const totalMilkAmount = milkCollections[0]?.total || 0;

    // Get advance payments
    const advances = await PaymentModel.aggregate([
      {
        $match: {
          vendor_id: new mongoose.Types.ObjectId(vendorId),
          payment_type: PaymentType.ADVANCE,
          status: PaymentStatus.PAID
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$advance_amount' }
        }
      }
    ]);

    const advanceAmount = advances[0]?.total || 0;

    // Get previous month pending
    const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    previousMonth.setHours(0, 0, 0, 0);
    
    const previousPayments = await PaymentModel.aggregate([
      {
        $match: {
          vendor_id: new mongoose.Types.ObjectId(vendorId),
          payment_month: { $gte: previousMonth },
          status: PaymentStatus.PENDING
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$final_amount' }
        }
      }
    ]);

    const previousPending = previousPayments[0]?.total || 0;

    // Deductions (can be extended)
    const deductions = 0;

    // Final amount
    const finalAmount = totalMilkAmount - advanceAmount - deductions + previousPending;

    return {
      totalMilkAmount,
      advanceAmount,
      previousPending,
      deductions,
      finalAmount,
    };
  }

  async createPayment(paymentData: {
    vendor_id: string;
    payment_type: PaymentType;
    payment_month?: Date;
    total_amount: number;
    advance_amount?: number;
    previous_pending?: number;
    deductions?: number;
    final_amount: number;
    payment_notes?: string;
    created_by: string;
  }): Promise<Payment> {
    const paymentMonth = paymentData.payment_month
      ? new Date(paymentData.payment_month.getFullYear(), paymentData.payment_month.getMonth(), 1)
      : null;

    const paymentCode = `PAY-${uuidv4().substring(0, 8).toUpperCase()}`;

    const payment = await PaymentModel.create({
      ...paymentData,
      vendor_id: new mongoose.Types.ObjectId(paymentData.vendor_id),
      payment_code: paymentCode,
      payment_month: paymentMonth,
      advance_amount: paymentData.advance_amount || 0,
      previous_pending: paymentData.previous_pending || 0,
      deductions: paymentData.deductions || 0,
      status: PaymentStatus.PENDING,
      created_by: new mongoose.Types.ObjectId(paymentData.created_by),
    });

    // Create notification
    await NotificationModel.create({
      user_id: new mongoose.Types.ObjectId(paymentData.vendor_id),
      user_role: 'vendor',
      title: 'Payment Generated',
      message: `Monthly payment of ₹${paymentData.final_amount} has been generated.`,
      type: 'payment_released',
      priority: 'high',
      is_read: false,
      metadata: { payment_id: payment._id.toString() },
    });

    return toPlainObject(payment) as Payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    transactionId?: string,
    paymentMethod?: string
  ): Promise<Payment> {
    const updateData: any = {
      status,
    };

    if (status === PaymentStatus.PAID) {
      updateData.paid_at = new Date();
      updateData.transaction_id = transactionId;
      updateData.payment_method = paymentMethod;
    }

    const payment = await PaymentModel.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true }
    );

    if (!payment) {
      throw new Error('Payment not found');
    }

    return toPlainObject(payment) as Payment;
  }

  async getPayments(filters: {
    vendor_id?: string;
    payment_month?: Date;
    status?: PaymentStatus;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const query: any = {};

    if (filters.vendor_id) {
      query.vendor_id = new mongoose.Types.ObjectId(filters.vendor_id);
    }
    if (filters.payment_month) {
      const monthStart = new Date(filters.payment_month.getFullYear(), filters.payment_month.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(filters.payment_month.getFullYear(), filters.payment_month.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      query.payment_month = { $gte: monthStart, $lte: monthEnd };
    }
    if (filters.status) {
      query.status = filters.status;
    }

    let mongooseQuery = PaymentModel.find(query).sort({ created_at: -1 });

    if (filters.limit) {
      mongooseQuery = mongooseQuery.limit(filters.limit);
    }
    if (filters.offset) {
      mongooseQuery = mongooseQuery.skip(filters.offset);
    }

    const payments = await mongooseQuery;
    return payments.map(payment => toPlainObject(payment) as Payment);
  }
}

export default new PaymentService();
