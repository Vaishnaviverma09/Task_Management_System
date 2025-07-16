// config/config.js
require('dotenv').config(); // ✅ This line is essential

console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager'
};
