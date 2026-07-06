import { Schema, model, Document, Types } from 'mongoose';

export interface IRecoveryLog extends Document {
  userId: Types.ObjectId;
  reason: string;
  inactiveDays: number;
  originalWeeklyHours: number; // Changed to weekly as per User model
  adjustedWeeklyHours: number; // Changed to weekly
  recoveryTasksScheduled: {
    task: string;
    estimatedTime: number;
    date: Date;
    completed: boolean;
  }[];
  status: 'Active' | 'Completed' | 'Cancelled'; // Added Cancelled
  recoveryPlanCreated: Date;
  recoveryPlanCompleted?: Date; // When the plan was completed
}

const recoveryLogSchema = new Schema<IRecoveryLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  inactiveDays: { type: Number, required: true },
  originalWeeklyHours: { type: Number, required: true },
  adjustedWeeklyHours: { type: Number, required: true },
  recoveryTasksScheduled: [{ task: String, estimatedTime: Number, date: Date, completed: { type: Boolean, default: false } }],
  status: { type: String, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },
  recoveryPlanCreated: { type: Date, default: Date.now },
  recoveryPlanCompleted: { type: Date },
});

export const RecoveryLog = model<IRecoveryLog>('RecoveryLog', recoveryLogSchema);