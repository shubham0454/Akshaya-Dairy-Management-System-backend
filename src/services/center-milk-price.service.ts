import { CenterMilkPriceModel, ICenterMilkPrice } from '../models/CenterMilkPrice.model';
import { ActivityLogModel } from '../models/ActivityLog.model';
import { CenterMilkPrice, MilkType } from '../models/types';
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

export class CenterMilkPriceService {
  /**
   * Set or update center-specific milk price
   */
  async setCenterPrice(priceData: {
    center_id: string;
    price_date: Date;
    milk_type: MilkType;
    base_price: number;
    net_price?: number;
    base_fat: number;
    base_snf: number;
    fat_rate: number;
    snf_rate: number;
    bonus?: number;
    notes?: string;
    created_by: string;
  }): Promise<CenterMilkPrice> {
    const priceDate = new Date(priceData.price_date);
    priceDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(priceDate);
    dateEnd.setHours(23, 59, 59, 999);

    // Check if price already exists
    const existing = await CenterMilkPriceModel.findOne({
      center_id: new mongoose.Types.ObjectId(priceData.center_id),
      price_date: { $gte: priceDate, $lte: dateEnd },
      milk_type: priceData.milk_type,
    });

    if (existing) {
      // Store old prices before updating
      const oldBasePrice = existing.base_price;
      const oldNetPrice = existing.net_price;

      // Update existing price
      existing.base_price = priceData.base_price;
      existing.net_price = priceData.net_price ?? undefined;
      existing.old_base_price = oldBasePrice !== priceData.base_price ? oldBasePrice : existing.old_base_price;
      existing.old_net_price = oldNetPrice && oldNetPrice !== priceData.net_price ? oldNetPrice : existing.old_net_price;
      existing.base_fat = priceData.base_fat;
      existing.base_snf = priceData.base_snf;
      existing.fat_rate = priceData.fat_rate;
      existing.snf_rate = priceData.snf_rate;
      existing.bonus = priceData.bonus || 0;
      existing.notes = priceData.notes;
      (existing as any).modified_by = new mongoose.Types.ObjectId(priceData.created_by);
      await existing.save();

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(priceData.created_by),
        action: 'update_center_milk_price',
        entity_type: 'center_milk_price',
        entity_id: existing._id.toString(),
        description: `Updated ${priceData.milk_type} milk price for center on ${priceDate.toISOString().split('T')[0]}`,
        old_values: toPlainObject(existing),
        new_values: toPlainObject(existing),
      });

      return toPlainObject(existing) as CenterMilkPrice;
    } else {
      // Create new price
      const newPrice = await CenterMilkPriceModel.create({
        ...priceData,
        center_id: new mongoose.Types.ObjectId(priceData.center_id),
        price_date: priceDate,
        is_active: true,
        created_by: new mongoose.Types.ObjectId(priceData.created_by),
      });

      // Log activity
      await ActivityLogModel.create({
        user_id: new mongoose.Types.ObjectId(priceData.created_by),
        action: 'create_center_milk_price',
        entity_type: 'center_milk_price',
        entity_id: newPrice._id.toString(),
        description: `Created ${priceData.milk_type} milk price for center on ${priceDate.toISOString().split('T')[0]}`,
        new_values: toPlainObject(newPrice),
      });

      return toPlainObject(newPrice) as CenterMilkPrice;
    }
  }

  /**
   * Get center price for a specific date and milk type
   */
  async getCenterPrice(
    centerId: string,
    date: Date,
    milkType: MilkType
  ): Promise<CenterMilkPrice | null> {
    const priceDate = new Date(date);
    priceDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(priceDate);
    dateEnd.setHours(23, 59, 59, 999);

    const price = await CenterMilkPriceModel.findOne({
      center_id: new mongoose.Types.ObjectId(centerId),
      price_date: { $gte: priceDate, $lte: dateEnd },
      milk_type: milkType,
      is_active: true,
    });

    return price ? toPlainObject(price) as CenterMilkPrice : null;
  }

  /**
   * Get all center prices for a date range
   */
  async getCenterPrices(filters: {
    center_id?: string;
    start_date?: Date;
    end_date?: Date;
    milk_type?: MilkType;
  }): Promise<CenterMilkPrice[]> {
    const query: any = { is_active: true };

    if (filters.center_id) {
      query.center_id = new mongoose.Types.ObjectId(filters.center_id);
    }
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

    const prices = await CenterMilkPriceModel.find(query)
      .sort({ price_date: -1, milk_type: 1 });

    return prices.map(price => toPlainObject(price) as CenterMilkPrice);
  }
}

export default new CenterMilkPriceService();
