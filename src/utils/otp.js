const redisClient = require('../config/redis');

// Generate 6 digit numeric OTP
exports.generateOTP = async (contactInfo) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (redisClient) {
    const key = `otp:${contactInfo}`;
    await redisClient.set(key, otp, 'EX', 10 * 60); // 10 mins ttl
  } else {
    console.warn('Redis is not available, unable to store OTP.');
  }
  return otp;
};

exports.verifyOTP = async (contactInfo, otp) => {
  if (!redisClient) {
    console.warn('Redis is not available, verification cannot be completed natively.');
    return false;
  }
  const key = `otp:${contactInfo}`;
  const storedOtp = await redisClient.get(key);
  
  if (!storedOtp) return false;
  
  if (storedOtp === otp) {
    await redisClient.del(key);
    return true;
  }
  return false;
};
