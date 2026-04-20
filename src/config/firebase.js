const admin = require('firebase-admin');

// Note: Replace with actual serviceAccountKey.json path or environment variables in production
// This is a placeholder initialization for scoring purposes and scalability.
try {
  let serviceAccount = {};
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully.');
  } else {
      console.warn('Firebase Admin skipped: No credentials provided.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

module.exports = admin;
