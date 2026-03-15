/**
 * MongoDB seed script – run with: npm run seed
 * Requires MONGODB_URI in .env. Seeds users, dairy centers, drivers, milk prices.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/User.model';
import { DairyCenterModel } from '../models/DairyCenter.model';
import { DriverModel } from '../models/Driver.model';
import { DriverCenterAssignmentModel } from '../models/DriverCenterAssignment.model';
import { MilkPriceModel } from '../models/MilkPrice.model';
import { UserRole } from '../models/types';
import { MilkType } from '../models/types';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/akshaya_dairy';

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const hashedAdmin = await bcrypt.hash('admin123', 10);
  const hashedVendor = await bcrypt.hash('vendor123', 10);
  const hashedDriver = await bcrypt.hash('driver123', 10);

  // ----- Users -----
  const adminUser = await UserModel.findOne({ role: UserRole.ADMIN });
  if (!adminUser) {
    const admin = await UserModel.create({
      mobile_no: '9876543210',
      email: 'admin@akshayadairy.com',
      password: hashedAdmin,
      role: UserRole.ADMIN,
      first_name: 'Admin',
      last_name: 'User',
      is_active: true,
      is_verified: true,
    });
    console.log('Created admin user:', admin.email);
  } else {
    console.log('Admin user already exists.');
  }

  const vendorUser = await UserModel.findOne({ role: UserRole.VENDOR, mobile_no: '9876543211' });
  let vendorId: mongoose.Types.ObjectId;
  if (!vendorUser) {
    const vendor = await UserModel.create({
      mobile_no: '9876543211',
      email: 'vendor@akshayadairy.com',
      password: hashedVendor,
      role: UserRole.VENDOR,
      first_name: 'Vendor',
      last_name: 'One',
      is_active: true,
      is_verified: true,
    });
    vendorId = vendor._id;
    console.log('Created vendor user:', vendor.email);
  } else {
    vendorId = vendorUser._id;
    console.log('Vendor user already exists.');
  }

  const driverUser = await UserModel.findOne({ role: UserRole.DRIVER, mobile_no: '9876543212' });
  let driverUserId: mongoose.Types.ObjectId;
  if (!driverUser) {
    const driverUserDoc = await UserModel.create({
      mobile_no: '9876543212',
      email: 'driver@akshayadairy.com',
      password: hashedDriver,
      role: UserRole.DRIVER,
      first_name: 'Driver',
      last_name: 'One',
      is_active: true,
      is_verified: true,
    });
    driverUserId = driverUserDoc._id;
    console.log('Created driver user:', driverUserDoc.email);
  } else {
    driverUserId = driverUser._id;
    console.log('Driver user already exists.');
  }

  // ----- Dairy Centers -----
  let centerId: mongoose.Types.ObjectId;
  const existingCenter = await DairyCenterModel.findOne({ user_id: vendorId });
  if (!existingCenter) {
    const center = await DairyCenterModel.create({
      user_id: vendorId,
      dairy_name: 'Akshaya Dairy Center 1',
      address: { city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      contact_mobile: '9876543211',
      is_active: true,
    });
    centerId = center._id;
    console.log('Created dairy center:', center.dairy_name);
  } else {
    centerId = existingCenter._id;
    console.log('Dairy center already exists.');
  }

  // ----- Drivers -----
  const existingDriver = await DriverModel.findOne({ driver_id: driverUserId });
  if (!existingDriver) {
    const driver = await DriverModel.create({
      driver_id: driverUserId,
      center_id: centerId,
      license_number: 'DL-12345678',
      vehicle_number: 'MH-12-AB-1234',
      vehicle_type: 'Mini Truck',
      salary_per_month: 15000,
      joining_date: new Date(),
      is_on_duty: false,
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_mobile: '9876543213',
    });
    console.log('Created driver record for:', driver.vehicle_number);

    await DriverCenterAssignmentModel.create({
      driver_id: driver._id,
      center_id: centerId,
      is_active: true,
      assigned_at: new Date(),
    });
    console.log('Created driver-center assignment.');
  } else {
    console.log('Driver record already exists.');
  }

  // ----- Milk Prices -----
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const milkTypes = [MilkType.COW, MilkType.BUFFALO, MilkType.MIX_MILK] as const;
  const priceConfig: Record<string, { base_price: number; base_fat: number; base_snf: number; fat_rate: number; snf_rate: number; bonus: number }> = {
    [MilkType.COW]: { base_price: 36, base_fat: 3.5, base_snf: 8.5, fat_rate: 5, snf_rate: 5, bonus: 1 },
    [MilkType.BUFFALO]: { base_price: 48, base_fat: 6, base_snf: 9, fat_rate: 5, snf_rate: 5, bonus: 1 },
    [MilkType.MIX_MILK]: { base_price: 40, base_fat: 4.5, base_snf: 8.8, fat_rate: 5, snf_rate: 5, bonus: 1 },
  };

  for (const milkType of milkTypes) {
    const exists = await MilkPriceModel.findOne({ price_date: today, milk_type: milkType });
    if (!exists) {
      const config = priceConfig[milkType];
      await MilkPriceModel.create({
        price_date: today,
        base_price: config.base_price,
        base_fat: config.base_fat,
        base_snf: config.base_snf,
        fat_rate: config.fat_rate,
        snf_rate: config.snf_rate,
        bonus: config.bonus,
        milk_type: milkType,
        is_active: true,
        notes: 'Seed data',
      });
      console.log('Created milk price for', milkType);
    }
  }
  console.log('Milk prices checked/created.');

  console.log('\nSeed completed. You can login with:');
  console.log('  Admin  – mobile: 9876543210  password: admin123');
  console.log('  Vendor – mobile: 9876543211  password: vendor123');
  console.log('  Driver – mobile: 9876543212  password: driver123');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
