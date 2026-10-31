/**
 * ZAPCHAT - Configuration Template
 * 
 * Instructions:
 * 1. Copy this file to `config.js` in the project root:
 *    cp config.example.js config.js
 * 2. Replace the placeholder values with your real Firebase & API credentials.
 * 3. Never commit `config.js` to Git (it is automatically excluded by .gitignore).
 */

window.APP_CONFIG = {
    // Firebase Web App Configuration
    // Obtain these from Firebase Console -> Project Settings -> General -> Your Apps
    firebase: {
        apiKey: "YOUR_FIREBASE_API_KEY",
        authDomain: "your-project-id.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project-id.firebasestorage.app",
        messagingSenderId: "your-messaging-sender-id",
        appId: "your-app-id",
        measurementId: "your-measurement-id"
    },

    // ImgBB API Key for image uploads (chat photos, profile pictures, stickers)
    // Obtain a free API key at https://api.imgbb.com/
    imgbbApiKey: "YOUR_IMGBB_API_KEY",

    // Admin / Premium upgrade password
    adminVerificationPassword: "YOUR_ADMIN_PASSWORD"
};
