import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orvexa';
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] MongoDB Connection Warning: ${error.message}`);
    console.warn('[Database] Running in resilient mode with memory fallback if database is not reachable.');
    return null;
  }
};
