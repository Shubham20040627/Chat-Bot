/* js/config.js */

// Replace the production URL with your actual Render backend URL after deployment
const CONFIG = {
    development: 'http://localhost:3000',
    production: 'https://fitbot.onrender.com' // Change this after Render deployment
};

// Auto-detect environment
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.API_BASE_URL = isLocal ? CONFIG.development : CONFIG.production;

console.log(`🚀 ChatBot Running in ${isLocal ? 'development' : 'production'} mode`);
console.log(`🔗 API Base URL: ${window.API_BASE_URL}`);
