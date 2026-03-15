import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel, IUser } from '../models/User.model';
import { User, UserRole, JwtPayload } from '../models/types';
import logger from '../utils/logger';

export class AuthService {
  async login(mobileOrEmail: string, password: string): Promise<{
    user: Omit<User, 'password'>;
    token: string;
  }> {
    // Find user by mobile or email
    const user = await UserModel.findOne({
      $or: [
        { mobile_no: mobileOrEmail },
        { email: mobileOrEmail }
      ],
      is_active: true,
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_verified) {
      throw new Error('Account not verified. Please contact admin.');
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    const payload: JwtPayload = {
      userId: user._id.toString(),
      role: user.role as UserRole,
      email: user.email,
      mobile_no: user.mobile_no,
    };

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: expiresIn,
    } as SignOptions);

    const { password: _p, _id, __v, ...rest } = user.toObject();
    const userObj = { ...rest, id: _id.toString() };

    return {
      user: userObj as Omit<User, 'password'>,
      token,
    };
  }

  async register(userData: {
    mobile_no: string;
    email?: string;
    password: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
  }): Promise<Omit<User, 'password'>> {
    // Check if user already exists
    const existingUserQuery: any = { mobile_no: userData.mobile_no };
    if (userData.email) {
      existingUserQuery.$or = [
        { mobile_no: userData.mobile_no },
        { email: userData.email }
      ];
    }
    const existingUser = await UserModel.findOne(existingUserQuery);

    if (existingUser) {
      throw new Error('User with this mobile number or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await UserModel.create({
      ...userData,
      password: hashedPassword,
      is_active: true,
      is_verified: userData.role === UserRole.ADMIN ? true : false, // Admin auto-verified
    });

    const { password: _p, _id, __v, ...rest } = user.toObject();
    return { ...rest, id: _id.toString() } as Omit<User, 'password'>;
  }

  async getCurrentUser(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const { password: _p, _id, __v, ...rest } = user.toObject();
    return { ...rest, id: _id.toString() } as Omit<User, 'password'>;
  }
}

export default new AuthService();

