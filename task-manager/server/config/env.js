require('dotenv').config();

module.exports = {
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanager',
  jwtSecret: process.env.JWT_SECRET || 'kd8Bf47rTYL@@!kdiu289',
  jwtExpire: process.env.JWT_EXPIRE || '5h'
};