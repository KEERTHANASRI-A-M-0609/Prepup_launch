import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyTask extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  task: string;
  estimatedTime: number; // in minutes
  category: 'DSA' | 'Projects' | 'Resume' | 'Communication' | 'Aptitude' | 'Interview';
  impact: string; // e.g., "+2 Readiness"
  resourceLink?: string;
  completed: boolean;
  completedAt?: Date;
}

const dailyTaskSchema = new Schema<IDailyTask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true },
  task: { type: String, required: true },
  estimatedTime: { type: Number, required: true },
  category: { type: String, enum: ['DSA', 'Projects', 'Resume', 'Communication', 'Aptitude', 'Interview'], required: true },
  impact: { type: String, required: true },
  resourceLink: { type: String },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

export const DailyTask = mongoose.model<IDailyTask>('DailyTask', dailyTaskSchema);