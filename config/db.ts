import mongoose from "mongoose";
export const connectDatabase = () => {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }
  
    mongoose
      .connect(mongoUri)
      .then(() => {
        console.log('Connection to DB successful');
      })
      .catch((e) => {
        console.error(e, 'Database connection error');
      });
  };