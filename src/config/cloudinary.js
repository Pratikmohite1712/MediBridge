const { v2: cloudinary } = require('cloudinary');

try {
  if (
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_KEY !== 'mock_cloudinary_key'
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('Cloudinary initialized successfully.');
  } else {
    console.warn('Cloudinary variables missing or mocked. File uploads will fail gracefully.');
  }
} catch (error) {
  console.error('Error configuring Cloudinary:', error.message);
}

module.exports = cloudinary;
