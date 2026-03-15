const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000; // 3 seconds between retries

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async () => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,   // 10s to find a server
        socketTimeoutMS: 45000,            // 45s socket timeout
        connectTimeoutMS: 10000,           // 10s connection timeout
      });
      console.log(`[MongoDB] Connected: ${conn.connection.host}`);

      // Auto-reconnect handlers
      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected — Mongoose will auto-reconnect');
      });
      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected successfully');
      });
      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err.message);
      });

      return; // success — exit the retry loop
    } catch (error) {
      console.error(`[MongoDB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // linear backoff
        console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        console.error('[MongoDB] All connection attempts failed. Server will start without DB — routes will return errors until DB recovers.');
      }
    }
  }
};

module.exports = connectDB;
