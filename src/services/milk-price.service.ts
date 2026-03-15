import { MilkPriceModel, IMilkPrice } from '../models/MilkPrice.model';
import { ActivityLogModel } from '../models/ActivityLog.model';
import { NotificationModel } from '../models/Notification.model';
import { MilkPrice, MilkType } from '../models/types';
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

export class MilkPriceService {
  /**
   * Create or update daily milk price
   */
  async setDailyPrice(priceData: {
    price_date: Date;
    base_price: number;
    base_fat: number;
    base_snf: number;
    fat_rate: number;
    snf_rate: number;
    bonus: number;
    milk_type: MilkType;
    notes?: string;
    created_by: string;
  }): Promise<MilkPrice> {
    const priceDate = new Date(priceData.price_date);
    priceDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(priceDate);
    dateEnd.setHours(23, 59, 59, 999);

    // Check if price already exists for this date and milk type
    const existing = await MilkPriceModel.findOne({
      price_date: { $gte: priceDate, $lte: dateEnd },
      milk_type: priceData.milk_type,
    });

    if (existing) {
      // Update existing price
      existing.base_price = priceData.base_price;
      existing.base_fat = priceData.base_fat;
      existing.base_snf = priceData.base_snf;
      existing.fat_rate = priceData.fat_rate;
      existing.snf_rate = priceData.snf_rate;
      existing.bonus = priceData.bonus;
      existing.notes = priceData.notes;
      (existing as any).modified_by = new mongoose.Types.ObjectId(priceData.created_by);
      await existing.save();

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(priceData.created_by),
        action: 'update_milk_price',
        entity_type: 'milk_price',
        entity_id: existing._id.toString(),
        description: `Updated milk price for ${priceData.milk_type} on ${priceDate.toISOString().split('T')[0]}`,
        old_values: toPlainObject(existing),
        new_values: toPlainObject(existing),
      });

      return toPlainObject(existing) as MilkPrice;
    } else {
      // Create new price
      const newPrice = await MilkPriceModel.create({
        ...priceData,
        price_date: priceDate,
        is_active: true,
        created_by: new mongoose.Types.ObjectId(priceData.created_by),
      });

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(priceData.created_by),
        action: 'create_milk_price',
        entity_type: 'milk_price',
        entity_id: newPrice._id.toString(),
        description: `Created milk price for ${priceData.milk_type} on ${priceDate.toISOString().split('T')[0]}`,
        new_values: toPlainObject(newPrice),
      });

      // Create notification for all users
      await NotificationModel.create({
        user_role: 'all',
        title: 'Milk Rate Updated',
        message: `Today's ${priceData.milk_type} milk rate has been updated. Base: ₹${priceData.base_price}, FAT: ${priceData.base_fat}%, SNF: ${priceData.base_snf}%`,
        type: 'rate_update',
        priority: 'high',
        is_read: false,
      });

      return toPlainObject(newPrice) as MilkPrice;
    }
  }

  /**
   * Get price for a specific date and milk type
   */
  async getPrice(date: Date, milkType: MilkType): Promise<MilkPrice | null> {
    const priceDate = new Date(date);
    priceDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(priceDate);
    dateEnd.setHours(23, 59, 59, 999);

    const price = await MilkPriceModel.findOne({
      price_date: { $gte: priceDate, $lte: dateEnd },
      milk_type: milkType,
      is_active: true,
    });

    return price ? toPlainObject(price) as MilkPrice : null;
  }

  /**
   * Get all prices for a date range
   */
  async getPrices(filters: {
    start_date?: Date;
    end_date?: Date;
    milk_type?: MilkType;
    limit?: number;
    offset?: number;
  }): Promise<MilkPrice[]> {
    const query: any = { is_active: true };

    if (filters.start_date) {
      const start = new Date(filters.start_date);
      start.setHours(0, 0, 0, 0);
      query.price_date = { ...query.price_date, $gte: start };
    }

    if (filters.end_date) {
      const end = new Date(filters.end_date);
      end.setHours(23, 59, 59, 999);
      query.price_date = { ...query.price_date, $lte: end };
    }

    if (filters.milk_type) {
      query.milk_type = filters.milk_type;
    }

    let mongooseQuery = MilkPriceModel.find(query)
      .sort({ price_date: -1, milk_type: 1 });

    if (filters.limit) {
      mongooseQuery = mongooseQuery.limit(filters.limit);
    }
    if (filters.offset) {
      mongooseQuery = mongooseQuery.skip(filters.offset);
    }

    const prices = await mongooseQuery;
    return prices.map(price => toPlainObject(price) as MilkPrice);
  }

  /**
   * Calculate price preview for given FAT and SNF
   */
  async calculatePricePreview(
    milkType: MilkType,
    fatPercentage: number,
    snfPercentage: number,
    date?: Date
  ): Promise<{
    rate: number;
    price: MilkPrice;
  }> {
    const targetDate = date || new Date();
    const price = await this.getPrice(targetDate, milkType);

    if (!price) {
      throw new Error(`Milk price not set for ${milkType} on ${targetDate.toISOString().split('T')[0]}`);
    }

    // Calculate rate
    const fatDifference = fatPercentage - (price.base_fat || 0);
    const snfDifference = snfPercentage - (price.base_snf || 0);
    const rate = price.base_price + (fatDifference * price.fat_rate) + (snfDifference * price.snf_rate) + (price.bonus || 0);
    const roundedRate = Math.round(rate * 100) / 100;

    return {
      rate: roundedRate,
      price,
    };
  }
}

export default new MilkPriceService();
