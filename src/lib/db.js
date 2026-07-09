import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables.");
}

const globalWithMongoose = global;

if (!globalWithMongoose.__mongooseCache) {
  globalWithMongoose.__mongooseCache = {
    conn: null,
    promise: null,
  };
}

const cache = globalWithMongoose.__mongooseCache;

export async function connectToDatabase() {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 3,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
