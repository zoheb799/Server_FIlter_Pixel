import mongoose, { Schema, Document, Model } from "mongoose";

// Define an interface representing a user document in MongoDB
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
}

// Define a model interface extending the mongoose Model<IUser>
export interface IUserModel extends Model<IUser> {}

// Define the schema corresponding to the IUser interface
const userSchema: Schema<IUser> = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

// Export the User model
export const User: IUserModel = mongoose.model<IUser, IUserModel>("User", userSchema);
