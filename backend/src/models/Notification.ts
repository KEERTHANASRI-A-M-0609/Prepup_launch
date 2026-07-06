import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'danger'
  moduleId?: string
  read: boolean
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'success', 'danger'], default: 'info' },
    moduleId: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
