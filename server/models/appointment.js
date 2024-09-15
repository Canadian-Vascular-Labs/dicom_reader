const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
   date: { type: Date, required: true },
   createdBy: {
      type: Schema.Types.ObjectId, ref: 'User',
      required: true
   },
   patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
   doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
   modified: {
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      on: { type: Date }
   },

   reason: { type: String },
   notes: { type: String }
});

module.exports = mongoose.model('Appointment', appointmentSchema);