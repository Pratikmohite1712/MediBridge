const Redis = require('ioredis');

let redisClient = null;

try {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        console.warn('Redis connection failed after 3 retries, giving up.');
        return null; // Stop retrying
      }
      return Math.min(times * 500, 2000);
    }
  });

  redisClient.on('error', (err) => {
    console.warn(`Redis Client Error: ${err.message}. Redis features will be degraded.`);
  });

  redisClient.on('connect', () => {
    console.log('Successfully connected to Redis');
  });

} catch (error) {
  console.warn('Failed to initialize Redis client. Session features will degraded.', error.message);
}

module.exports = redisClient;
