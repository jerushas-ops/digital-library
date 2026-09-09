const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/digital_library';

  try {
    // Attempt standard connection to MongoDB URI (Local or Atlas)
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (primaryError) {
    console.warn(`[Database] Warning: Could not connect to primary MongoDB at ${uri}.`);
    console.log(`[Database] Reason: ${primaryError.message}`);
    console.log(`[Database] Initializing in-memory MongoDB fallback instance for zero-friction evaluation...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();

      const conn = await mongoose.connect(memoryUri);
      console.log(`[Database] In-Memory MongoDB Server Connected successfully at: ${memoryUri}`);
      return conn;
    } catch (fallbackError) {
      console.error(`[Database] Fatal Error: Failed to connect to MongoDB and Fallback failed:`, fallbackError.message);
      throw fallbackError;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (error) {
    console.error('[Database] Error during disconnect:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};
