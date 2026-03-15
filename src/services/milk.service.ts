import { MilkCollectionModel, IMilkCollection } from '../models/MilkCollection.model';
import { MilkPriceModel, IMilkPrice } from '../models/MilkPrice.model';
import { ActivityLogModel } from '../models/ActivityLog.model';
import { DairyCenterModel } from '../models/DairyCenter.model';
import { UserModel } from '../models/User.model';
import { MilkCollection, MilkPrice, CollectionTime, MilkType } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import centerMilkPriceService from './center-milk-price.service';
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

export class MilkService {
  async getTodayPrice(milkType: MilkType = MilkType.MIX_MILK): Promise<MilkPrice | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const price = await MilkPriceModel.findOne({
      price_date: {
        $gte: today,
        $lte: todayEnd
      },
      milk_type: milkType,
      is_active: true,
    });

    return price ? toPlainObject(price) as MilkPrice : null;
  }

  /**
   * Get center-specific price with fallback to global price
   */
  async getCenterPriceWithFallback(
    centerId: string,
    date: Date,
    milkType: MilkType
  ): Promise<MilkPrice | null> {
    // Ensure date is a valid Date object
    const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    validDate.setHours(0, 0, 0, 0);
    
    // First try to get center-specific price
    const centerPrice = await centerMilkPriceService.getCenterPrice(centerId, validDate, milkType);
    
    if (centerPrice) {
      // Convert CenterMilkPrice to MilkPrice format
      return {
        id: centerPrice.id,
        price_date: centerPrice.price_date,
        milk_type: centerPrice.milk_type as MilkType,
        base_price: centerPrice.base_price,
        base_fat: centerPrice.base_fat,
        base_snf: centerPrice.base_snf,
        fat_rate: centerPrice.fat_rate,
        snf_rate: centerPrice.snf_rate,
        bonus: centerPrice.bonus || 0,
        is_active: true,
        notes: centerPrice.notes || null,
        created_at: centerPrice.created_at,
        modified_at: centerPrice.modified_at,
        created_by: centerPrice.created_by || null,
        modified_by: centerPrice.modified_by || null,
      } as MilkPrice;
    }

    // Fallback to global price
    const dateStart = new Date(validDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(validDate);
    dateEnd.setHours(23, 59, 59, 999);

    const globalPrice = await MilkPriceModel.findOne({
      price_date: {
        $gte: dateStart,
        $lte: dateEnd
      },
      milk_type: milkType,
      is_active: true,
    });

    return globalPrice ? toPlainObject(globalPrice) as MilkPrice : null;
  }

  /**
   * Calculate milk price based on FAT and SNF percentages
   * Formula: Rate = Base Price + ((FAT - Base FAT) × FAT Rate) + ((SNF - Base SNF) × SNF Rate) + Bonus
   */
  async calculatePrice(
    basePrice: number,
    baseFat: number,
    baseSnf: number,
    fatRate: number,
    snfRate: number,
    bonus: number,
    fatPercentage: number,
    snfPercentage: number
  ): Promise<number> {
    // Calculate differences from base
    const fatDifference = fatPercentage - baseFat;
    const snfDifference = snfPercentage - baseSnf;
    
    // Calculate rate: Base Price + (FAT diff × FAT rate) + (SNF diff × SNF rate) + Bonus
    const rate = basePrice + (fatDifference * fatRate) + (snfDifference * snfRate) + bonus;
    
    // Round to 2 decimal places
    return Math.round(rate * 100) / 100;
  }

  async createCollection(collectionData: {
    driver_id?: string;
    center_id: string;
    collection_date: Date;
    collection_time: CollectionTime;
    milk_type: MilkType;
    milk_weight: number;
    fat_percentage?: number;
    snf_percentage?: number;
    rate_per_liter?: number;
    can_number?: string;
    can_weight_kg?: number;
    quality_notes?: string;
    created_by: string;
  }): Promise<MilkCollection> {
    const collectionDate = new Date(collectionData.collection_date);
    collectionDate.setHours(0, 0, 0, 0);
    
    // Check if a collection already exists for this center, date, time, and milk type
    const existingCollection = await MilkCollectionModel.findOne({
      center_id: new mongoose.Types.ObjectId(collectionData.center_id),
      collection_date: {
        $gte: new Date(collectionDate.setHours(0, 0, 0, 0)),
        $lt: new Date(collectionDate.setHours(23, 59, 59, 999))
      },
      collection_time: collectionData.collection_time,
      milk_type: collectionData.milk_type,
    });
    
    if (existingCollection) {
      throw new Error(
        `Milk collection already exists for this center, date (${new Date(collectionData.collection_date).toISOString().split('T')[0]}), time (${collectionData.collection_time}), and milk type (${collectionData.milk_type}). Please change the date or update the existing collection.`
      );
    }
    
    // Set vendor_id = center_id (they are the same in the database)
    const vendor_id = collectionData.center_id;
    
    let ratePerLiter: number;
    let baseValue: number;
    
    // If rate_per_liter is provided directly, use it
    if (collectionData.rate_per_liter !== undefined && collectionData.rate_per_liter !== null) {
      ratePerLiter = collectionData.rate_per_liter;
      const price = await this.getCenterPriceWithFallback(
        collectionData.center_id,
        collectionData.collection_date,
        collectionData.milk_type
      );
      baseValue = price?.base_price || ratePerLiter;
    } else {
      // Calculate rate per liter from FAT/SNF
      let price = await this.getCenterPriceWithFallback(
        collectionData.center_id,
        collectionData.collection_date,
        collectionData.milk_type
      );
      
      // If no price found, use default values
      if (!price) {
        logger.warn(`No price found for ${collectionData.milk_type} milk on ${new Date(collectionData.collection_date).toISOString().split('T')[0]}. Using default values.`);
        
        const defaultPrices: Record<MilkType, Partial<MilkPrice>> = {
          cow: {
            base_price: 36.00,
            base_fat: 3.5,
            base_snf: 8.5,
            fat_rate: 5.0,
            snf_rate: 5.0,
            bonus: 1.00,
          },
          buffalo: {
            base_price: 51.00,
            base_fat: 6.0,
            base_snf: 9.0,
            fat_rate: 5.0,
            snf_rate: 5.0,
            bonus: 1.00,
          },
          mix_milk: {
            base_price: 40.00,
            base_fat: 4.5,
            base_snf: 8.75,
            fat_rate: 5.0,
            snf_rate: 5.0,
            bonus: 1.00,
          },
        };
        
        const defaults = defaultPrices[collectionData.milk_type];
        price = {
          id: '',
          price_date: collectionData.collection_date,
          milk_type: collectionData.milk_type,
          base_price: defaults.base_price!,
          base_fat: defaults.base_fat!,
          base_snf: defaults.base_snf!,
          fat_rate: defaults.fat_rate!,
          snf_rate: defaults.snf_rate!,
          bonus: defaults.bonus!,
          is_active: true,
          notes: `Default price used - no price set for this date`,
          created_at: new Date(),
          modified_at: new Date(),
          created_by: undefined,
          modified_by: undefined,
        } as MilkPrice;
      }

      // Validate FAT and SNF percentages
      if (collectionData.fat_percentage !== undefined && collectionData.fat_percentage !== null) {
        if (collectionData.fat_percentage < 0 || collectionData.fat_percentage > 100) {
          throw new Error('FAT percentage must be between 0 and 100');
        }
      }
      if (collectionData.snf_percentage !== undefined && collectionData.snf_percentage !== null) {
        if (collectionData.snf_percentage < 0 || collectionData.snf_percentage > 100) {
          throw new Error('SNF percentage must be between 0 and 100');
        }
      }
      
      // Calculate rate per liter
      ratePerLiter = await this.calculatePrice(
        price.base_price,
        price.base_fat || 0,
        price.base_snf || 0,
        price.fat_rate,
        price.snf_rate,
        price.bonus || 0,
        collectionData.fat_percentage || 0,
        collectionData.snf_percentage || 0
      );
      
      ratePerLiter = Math.max(ratePerLiter, price.base_price);
      if (ratePerLiter < 0) {
        logger.warn(`Calculated negative rate per liter: ${ratePerLiter}. Using base price (${price.base_price}) instead.`);
        ratePerLiter = price.base_price;
      }
      
      baseValue = price.base_price;
    }

    // Calculate total amount
    const totalAmount = collectionData.milk_weight * ratePerLiter;
    const roundedAmount = Math.round(totalAmount * 100) / 100;

    // Generate collection code
    const dateStr = new Date(collectionData.collection_date).toISOString().split('T')[0].replace(/-/g, '');
    const collectionCode = `MC-${dateStr}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create new collection
    const collection = await MilkCollectionModel.create({
      ...collectionData,
      vendor_id: new mongoose.Types.ObjectId(vendor_id),
      center_id: new mongoose.Types.ObjectId(collectionData.center_id),
      driver_id: collectionData.driver_id ? new mongoose.Types.ObjectId(collectionData.driver_id) : null,
      collection_code: collectionCode,
      base_value: baseValue,
      rate_per_liter: ratePerLiter,
      total_amount: roundedAmount,
      fat_percentage: collectionData.fat_percentage !== undefined ? collectionData.fat_percentage : null,
      snf_percentage: collectionData.snf_percentage !== undefined ? collectionData.snf_percentage : null,
      status: 'collected',
      is_synced: true,
      collected_at: new Date(),
      collection_date: collectionDate,
      created_by: new mongoose.Types.ObjectId(collectionData.created_by),
    });

    // Log activity
    await ActivityLogModel.create({
      user_id: new mongoose.Types.ObjectId(collectionData.created_by),
      action: 'add_milk',
      entity_type: 'milk_collection',
      entity_id: collection._id.toString(),
      description: `Milk collection added: ${collectionData.milk_weight}kg (${collectionData.milk_type}) - Center: ${collectionData.center_id}, Date: ${new Date(collectionData.collection_date).toISOString().split('T')[0]}, Time: ${collectionData.collection_time}`,
      new_values: toPlainObject(collection),
    });

    return toPlainObject(collection) as MilkCollection;
  }

  async getCollections(filters: {
    center_id?: string;
    driver_id?: string;
    collection_date?: Date | string;
    start_date?: string;
    end_date?: string;
    collection_time?: CollectionTime;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<MilkCollection[]> {
    const query: any = {};

    if (filters.center_id) {
      query.center_id = new mongoose.Types.ObjectId(filters.center_id);
    }
    if (filters.driver_id) {
      query.driver_id = new mongoose.Types.ObjectId(filters.driver_id);
    }
    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.end_date);
      end.setHours(23, 59, 59, 999);
      query.collection_date = { $gte: start, $lte: end };
    } else if (filters.collection_date) {
      const date = new Date(filters.collection_date);
      date.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      query.collection_date = { $gte: date, $lte: dateEnd };
    }
    if (filters.collection_time) {
      query.collection_time = filters.collection_time;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    let mongooseQuery = MilkCollectionModel.find(query)
      .populate('vendor_id', 'dairy_name', DairyCenterModel)
      .populate('center_id', 'dairy_name', DairyCenterModel)
      .populate('driver_id', 'first_name last_name', UserModel)
      .sort({ center_id: 1, collection_date: -1, collection_time: 1, created_at: -1 });

    if (filters.limit) {
      mongooseQuery = mongooseQuery.limit(filters.limit);
    }
    if (filters.offset) {
      mongooseQuery = mongooseQuery.skip(filters.offset);
    }

    const collections = await mongooseQuery;
    return collections.map((collection: any) => {
      const obj = toPlainObject(collection);
      // Add populated fields
      if (collection.vendor_id && typeof collection.vendor_id === 'object') {
        obj.vendor_name = (collection.vendor_id as any).dairy_name;
      }
      if (collection.center_id && typeof collection.center_id === 'object') {
        obj.center_name = (collection.center_id as any).dairy_name;
      }
      if (collection.driver_id && typeof collection.driver_id === 'object') {
        obj.driver_name = `${(collection.driver_id as any).first_name || ''} ${(collection.driver_id as any).last_name || ''}`.trim();
      }
      return obj;
    }) as MilkCollection[];
  }

  async getCollectionById(id: string): Promise<MilkCollection | null> {
    const collection = await MilkCollectionModel.findById(id)
      .populate('vendor_id', 'dairy_name', DairyCenterModel)
      .populate('driver_id', 'first_name last_name', UserModel);

    if (!collection) return null;

    const obj = toPlainObject(collection);
    if (collection.vendor_id && typeof collection.vendor_id === 'object') {
      obj.vendor_name = (collection.vendor_id as any).dairy_name;
    }
    if (collection.driver_id && typeof collection.driver_id === 'object') {
      obj.driver_name = `${(collection.driver_id as any).first_name || ''} ${(collection.driver_id as any).last_name || ''}`.trim();
    }
    return obj as MilkCollection;
  }

  async updateCollection(
    id: string,
    updateData: {
      fat_percentage?: number;
      snf_percentage?: number;
      rate_per_liter?: number;
      total_amount?: number;
      base_value?: number;
      net_price?: number;
      old_base_price?: number;
      old_net_price?: number;
    },
    modifiedBy: string
  ): Promise<MilkCollection> {
    const existing = await MilkCollectionModel.findById(id);
    if (!existing) {
      throw new Error('Collection not found');
    }

    const updateFields: any = {
      modified_by: new mongoose.Types.ObjectId(modifiedBy),
    };

    if (updateData.fat_percentage !== undefined) {
      updateFields.fat_percentage = updateData.fat_percentage;
    }
    if (updateData.snf_percentage !== undefined) {
      updateFields.snf_percentage = updateData.snf_percentage;
    }
    if (updateData.rate_per_liter !== undefined) {
      updateFields.rate_per_liter = updateData.rate_per_liter;
    }
    if (updateData.total_amount !== undefined) {
      updateFields.total_amount = updateData.total_amount;
    }
    if (updateData.base_value !== undefined) {
      if (existing.base_value && existing.base_value !== updateData.base_value) {
        updateFields.old_base_price = existing.base_value;
      }
      updateFields.base_value = updateData.base_value;
    }
    if (updateData.net_price !== undefined) {
      const existingNet = (existing as any).net_price;
      if (existingNet != null && existingNet !== updateData.net_price) {
        updateFields.old_net_price = existingNet;
      }
      updateFields.net_price = updateData.net_price;
    }
    if (updateData.old_base_price !== undefined) {
      updateFields.old_base_price = updateData.old_base_price;
    }
    if (updateData.old_net_price !== undefined) {
      updateFields.old_net_price = updateData.old_net_price;
    }

    const updated = await MilkCollectionModel.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updated) {
      throw new Error('Collection update failed');
    }

    // Log activity
    await ActivityLogModel.create({
      user_id: new mongoose.Types.ObjectId(modifiedBy),
      action: 'update_milk_collection',
      entity_type: 'milk_collection',
      entity_id: id,
      description: 'Milk collection updated',
      old_values: toPlainObject(existing),
      new_values: toPlainObject(updated),
    });

    return toPlainObject(updated) as MilkCollection;
  }

  async getDashboardStats(date?: Date): Promise<{
    todayTotalMilk: number;
    morningMilk: number;
    eveningMilk: number;
    thisMonthMilk: number;
    lastMonthMilk: number;
  }> {
    const targetDate = date || new Date();
    const dateStart = new Date(targetDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);
    
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const lastMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    lastMonthEnd.setHours(23, 59, 59, 999);

    // Today's total
    const todayTotal = await MilkCollectionModel.aggregate([
      {
        $match: {
          collection_date: { $gte: dateStart, $lte: dateEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$milk_weight' }
        }
      }
    ]);

    // Morning milk
    const morningMilk = await MilkCollectionModel.aggregate([
      {
        $match: {
          collection_date: { $gte: dateStart, $lte: dateEnd },
          collection_time: 'morning'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$milk_weight' }
        }
      }
    ]);

    // Evening milk
    const eveningMilk = await MilkCollectionModel.aggregate([
      {
        $match: {
          collection_date: { $gte: dateStart, $lte: dateEnd },
          collection_time: 'evening'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$milk_weight' }
        }
      }
    ]);

    // This month
    const thisMonth = await MilkCollectionModel.aggregate([
      {
        $match: {
          collection_date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$milk_weight' }
        }
      }
    ]);

    // Last month
    const lastMonth = await MilkCollectionModel.aggregate([
      {
        $match: {
          collection_date: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$milk_weight' }
        }
      }
    ]);

    return {
      todayTotalMilk: todayTotal[0]?.total || 0,
      morningMilk: morningMilk[0]?.total || 0,
      eveningMilk: eveningMilk[0]?.total || 0,
      thisMonthMilk: thisMonth[0]?.total || 0,
      lastMonthMilk: lastMonth[0]?.total || 0,
    };
  }
}

export default new MilkService();
