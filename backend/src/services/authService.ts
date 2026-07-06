import { User, IUser } from '../models/User'
import { generateToken } from '../config/auth'
import { logger } from '../utils/logger'

export interface RegisterData {
  email: string
  password: string
  name: string
  college: string
  branch: string
  graduationYear: number
  targetRole: string
  targetCompanies: string[]
  weeklyHours: number
  cgpa: number
  phone?: string
}

export interface LoginData {
  email: string
  password: string
}

export interface AuthResponse {
  user: Partial<IUser>
  token: string
}

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const existingUser = await User.findOne({ email: data.email.toLowerCase() })
      if (existingUser) {
        throw new Error('Email already registered')
      }

      const user = new User({
        email: data.email.toLowerCase(),
        password: data.password,
        name: data.name,
        college: data.college,
        branch: data.branch,
        graduationYear: data.graduationYear,
        targetRole: data.targetRole,
        targetCompanies: data.targetCompanies,
        weeklyHours: data.weeklyHours,
        currentStage: 'Just Started', // Default stage on registration
        cgpa: data.cgpa,
        phone: data.phone,
        lastActive: new Date(),
      })

      await user.save()
      const token = generateToken(user._id.toString(), user.email)

      logger.info(`User registered: ${user.email}`)

      return {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          college: user.college,
          branch: user.branch,
          graduationYear: user.graduationYear,
          cgpa: user.cgpa,
          targetRole: user.targetRole,
          targetCompanies: user.targetCompanies,
          weeklyHours: user.weeklyHours,
          currentStage: user.currentStage,
          phone: user.phone,
        },
        token,
      }
    } catch (error) {
      logger.error('Registration error:', error)
      throw error
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password')
      if (!user) {
        throw new Error('Invalid email or password')
      }

      const isPasswordValid = await user.comparePassword(data.password)
      if (!isPasswordValid) {
        throw new Error('Invalid email or password')
      }

      user.lastActive = new Date()
      await user.save()

      const token = generateToken(user._id.toString(), user.email)

      logger.info(`User logged in: ${user.email}`)

      return {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          college: user.college,
          branch: user.branch,
          graduationYear: user.graduationYear,
          cgpa: user.cgpa,
          targetRole: user.targetRole,
          targetCompanies: user.targetCompanies,
          weeklyHours: user.weeklyHours,
          currentStage: user.currentStage,
          phone: user.phone,
        },
        token,
      }
    } catch (error) {
      logger.error('Login error:', error)
      throw error
    }
  },

  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId).select('-password')
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<IUser>
  ): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(userId, updates, {
        new: true,
      }).select('-password')

      if (user) {
        user.lastActive = new Date()
        await user.save()
        logger.info(`User profile updated: ${user.email}`)
      }

      return user
    } catch (error) {
      logger.error('Update profile error:', error)
      throw error
    }
  },
}
