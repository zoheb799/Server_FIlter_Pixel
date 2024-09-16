import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for the Image document
interface IImage extends Document {
  filename: string;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  format: 'png' | 'jpeg';
  status: 'uploaded' | 'processed';
}

// Define the Image schema
const imageSchema: Schema<IImage> = new Schema({
  filename: { type: String, required: true },
  brightness: { type: Number, default: 1 },
  contrast: { type: Number, default: 1 },
  saturation: { type: Number, default: 1 },
  rotation: { type: Number, default: 0 },
  format: { type: String, enum: ['png', 'jpeg'], default: 'jpeg' },
  status: { type: String, enum: ['uploaded', 'processed'], default: 'uploaded' }
}, { timestamps: true });

// Create and export the Image model
const Image = mongoose.model<IImage>('Image', imageSchema);
export default Image;
