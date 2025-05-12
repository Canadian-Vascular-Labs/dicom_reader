// Authenticated User Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
   name: { type: String, required: true },
   email: { type: String, required: true, unique: true },
   encryptedPassword: { type: String, required: true },
   role: {
      type: String,
      required: true,
      enum: ['admin', 'doctor', 'user'],
      default: 'user'
   },
});

module.exports = mongoose.model('User', UserSchema);