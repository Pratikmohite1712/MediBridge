const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const generateStorage = (folder) => {
  if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_KEY !== 'mock_cloudinary_key') {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: `medibridge/${folder}`,
        allowed_formats: ['jpg', 'png', 'jpeg', 'pdf'],
      },
    });
  }
  
  // Return memory storage as a graceful fallback if Cloudinary is not configured
  return multer.memoryStorage();
};

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'), false);
  }
};

const uploadConfig = (folder) => multer({
  storage: generateStorage(folder),
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

exports.uploadSingle = (fieldName) => uploadConfig('profiles').single(fieldName);
exports.uploadDocument = (fieldName) => uploadConfig('records').single(fieldName);
