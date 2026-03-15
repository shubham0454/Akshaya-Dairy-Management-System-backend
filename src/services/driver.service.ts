import { DriverModel, IDriver } from '../models/Driver.model';
import { DriverLocationModel, IDriverLocation } from '../models/DriverLocation.model';
import { DriverDutyLogModel, IDriverDutyLog } from '../models/DriverDutyLog.model';
import { DriverCenterAssignmentModel } from '../models/DriverCenterAssignment.model';
import { NotificationModel } from '../models/Notification.model';
import { DairyCenterModel } from '../models/DairyCenter.model';
import { UserModel } from '../models/User.model';
import { Driver, DriverLocation } from '../models/types';
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

export class DriverService {
  /**
   * Determine shift based on current time
   * Morning: 00:00 - 14:00 (before 2 PM)
   * Evening: 14:00 - 23:59 (2 PM onwards)
   */
  private getCurrentShift(): 'morning' | 'evening' {
    const hour = new Date().getHours();
    return hour < 14 ? 'morning' : 'evening';
  }

  async updateDutyStatus(driverId: string, isOnDuty: boolean, createdBy?: string): Promise<Driver> {
    // Get driver record first to get the driver.id (not driver_id)
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    if (!driverRecord) {
      throw new Error('Driver not found');
    }

    // Update driver status
    driverRecord.is_on_duty = isOnDuty;
    await driverRecord.save();
    
    // Verify the update was successful
    if (driverRecord.is_on_duty !== isOnDuty) {
      logger.error(`Driver status update mismatch: expected ${isOnDuty}, got ${driverRecord.is_on_duty}`);
      throw new Error('Status update failed - value mismatch');
    }

    logger.info(`Driver ${driverId} duty status updated to ${isOnDuty}`);

    // Log duty status to driver_duty_logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dutyDate = today;
    const shift = this.getCurrentShift();

    // Check if log entry exists for today's shift
    const existingLog = await DriverDutyLogModel.findOne({
      driver_id: driverRecord._id,
      duty_date: {
        $gte: new Date(dutyDate.setHours(0, 0, 0, 0)),
        $lt: new Date(dutyDate.setHours(23, 59, 59, 999))
      },
      shift: shift,
    });

    if (isOnDuty) {
      // Starting duty
      if (existingLog) {
        existingLog.is_on_duty = true;
        existingLog.duty_started_at = new Date();
        if (createdBy) (existingLog as any).modified_by = new mongoose.Types.ObjectId(createdBy);
        await existingLog.save();
      } else {
        await DriverDutyLogModel.create({
          driver_id: driverRecord._id,
          duty_date: dutyDate,
          shift: shift,
          is_on_duty: true,
          duty_started_at: new Date(),
          created_by: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
        });
      }
    } else {
      // Ending duty
      if (existingLog) {
        existingLog.is_on_duty = false;
        existingLog.duty_ended_at = new Date();
        if (createdBy) (existingLog as any).modified_by = new mongoose.Types.ObjectId(createdBy);
        await existingLog.save();
      } else {
        await DriverDutyLogModel.create({
          driver_id: driverRecord._id,
          duty_date: dutyDate,
          shift: shift,
          is_on_duty: false,
          duty_ended_at: new Date(),
          created_by: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
        });
      }
    }

    // Create notification
    await NotificationModel.create({
      user_id: new mongoose.Types.ObjectId(driverId),
      user_role: 'driver',
      title: isOnDuty ? 'Duty Started' : 'Duty Ended',
      message: isOnDuty 
        ? `You have started your ${shift} duty. You can now collect milk.`
        : `You have ended your ${shift} duty for today.`,
      type: 'duty_status',
      priority: 'medium',
      is_read: false,
    });

    return toPlainObject(driverRecord) as Driver;
  }

  async saveLocation(locationData: {
    driver_id: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    address?: string;
  }): Promise<DriverLocation> {
    // Get driver record to find the driver.id (not driver_id which is user id)
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(locationData.driver_id)
    });

    if (!driverRecord) {
      throw new Error('Driver not found');
    }

    const location = await DriverLocationModel.create({
      driver_id: driverRecord._id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy,
      speed: locationData.speed,
      address: locationData.address,
      recorded_at: new Date(),
    });

    return toPlainObject(location) as DriverLocation;
  }

  async getCurrentLocation(driverId: string): Promise<DriverLocation | null> {
    // Get driver record to find the driver.id
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    if (!driverRecord) {
      return null;
    }

    const location = await DriverLocationModel.findOne({
      driver_id: driverRecord._id
    })
      .sort({ recorded_at: -1 });

    return location ? toPlainObject(location) as DriverLocation : null;
  }

  async getLocationHistory(
    driverId: string,
    date?: Date
  ): Promise<DriverLocation[]> {
    // Get driver record to find the driver.id
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    if (!driverRecord) {
      return [];
    }

    const query: any = { driver_id: driverRecord._id };

    if (date) {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      query.recorded_at = { $gte: dateStart, $lte: dateEnd };
    }

    const locations = await DriverLocationModel.find(query)
      .sort({ recorded_at: -1 })
      .limit(100);

    return locations.map(loc => toPlainObject(loc) as DriverLocation);
  }

  async getDriverById(driverId: string): Promise<Driver | null> {
    const driver = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    return driver ? toPlainObject(driver) as Driver : null;
  }

  async getAssignedCenters(driverId: string): Promise<any[]> {
    // Get driver record to find the driver.id
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    if (!driverRecord) {
      return [];
    }

    const assignments = await DriverCenterAssignmentModel.find({
      driver_id: driverRecord._id,
      is_active: true
    })
      .populate('center_id', 'dairy_name address contact_mobile', DairyCenterModel)
      .select('center_id');

    return assignments.map(assignment => {
      const center = assignment.center_id as any;
      return toPlainObject(center || assignment);
    });
  }

  async getAllDrivers(filters: {
    is_on_duty?: boolean;
    center_id?: string;
    is_active?: boolean;
  }): Promise<any[]> {
    const query: any = {};

    if (filters.is_on_duty !== undefined) {
      query.is_on_duty = filters.is_on_duty;
    }
    if (filters.center_id) {
      query.center_id = new mongoose.Types.ObjectId(filters.center_id);
    }

    const drivers = await DriverModel.find(query)
      .populate('driver_id', 'first_name last_name mobile_no email is_active', UserModel);

    let results = drivers.map(driver => {
      const obj = toPlainObject(driver);
      const user = driver.driver_id as any;
      if (user) {
        obj.first_name = user.first_name;
        obj.last_name = user.last_name;
        obj.mobile_no = user.mobile_no;
        obj.email = user.email;
        if (filters.is_active !== undefined) {
          obj.is_active = user.is_active;
        }
      }
      return obj;
    });

    // Filter by is_active from users table if specified
    if (filters.is_active !== undefined) {
      results = results.filter(driver => driver.is_active === filters.is_active);
    }

    return results;
  }

  /**
   * Get monthly duty statistics for a driver
   */
  async getMonthlyDutyStatistics(
    driverId: string,
    year: number,
    month: number
  ): Promise<{
    totalDays: number;
    morningOnDuty: number;
    eveningOnDuty: number;
    morningLeave: number;
    eveningLeave: number;
    dutyLogs: any[];
  }> {
    // Get driver record to get driver.id
    const driverRecord = await DriverModel.findOne({
      driver_id: new mongoose.Types.ObjectId(driverId)
    });

    if (!driverRecord) {
      throw new Error('Driver not found');
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0); // Last day of the month
    endDate.setHours(23, 59, 59, 999);

    // Get all duty logs for the month
    const dutyLogs = await DriverDutyLogModel.find({
      driver_id: driverRecord._id,
      duty_date: { $gte: startDate, $lte: endDate }
    })
      .sort({ duty_date: 1, shift: 1 });

    const plainLogs = dutyLogs.map(log => toPlainObject(log));

    // Calculate statistics
    const morningOnDuty = plainLogs.filter(
      log => log.shift === 'morning' && log.is_on_duty === true
    ).length;

    const eveningOnDuty = plainLogs.filter(
      log => log.shift === 'evening' && log.is_on_duty === true
    ).length;

    const morningLeave = plainLogs.filter(
      log => log.shift === 'morning' && log.is_on_duty === false
    ).length;

    const eveningLeave = plainLogs.filter(
      log => log.shift === 'evening' && log.is_on_duty === false
    ).length;

    // Total unique days with any duty record
    const uniqueDays = new Set(plainLogs.map(log => {
      const date = new Date(log.duty_date);
      return date.toISOString().split('T')[0];
    }));
    const totalDays = uniqueDays.size;

    return {
      totalDays,
      morningOnDuty,
      eveningOnDuty,
      morningLeave,
      eveningLeave,
      dutyLogs: plainLogs,
    };
  }

  /**
   * Update duty status by driver record ID (used by admin)
   */
  async updateDutyStatusByDriverId(
    driverRecordId: string,
    isOnDuty: boolean,
    createdBy?: string
  ): Promise<Driver> {
    const driverRecord = await DriverModel.findById(driverRecordId);

    if (!driverRecord) {
      throw new Error('Driver not found');
    }

    return this.updateDutyStatus(driverRecord.driver_id.toString(), isOnDuty, createdBy);
  }
}

export default new DriverService();
