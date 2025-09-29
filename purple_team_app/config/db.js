const mongoose = require('mongoose');

mongoose.set('strictQuery', true);
if (process.env.NODE_ENV === 'production') mongoose.set('autoIndex', false);

/**
 * Connect to MongoDB using the provided URI.
 * In production, ensure TLS and proper authentication are configured.
 */
async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      tls: process.env.NODE_ENV === 'production'
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
}

module.exports = connectDB;
