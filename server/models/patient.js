const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const patientSchema = new Schema({
   name: { type: String, required: true },
   email: { type: String }, // unique?
   phoneNumber: { type: String, required: true },
   gender: { type: String, required: true }, // replace with valid options

   phoneNumber: { type: String, required: true },
   doctors: { type: Schema.Types.ObjectId, ref: 'Doctor' }, // Relating patients to doctors
   primaryPhysician: { type: Schema.Types.ObjectId, ref: 'Doctor' },
   medicalHistory: [String],
   appointments: [{
      date: { type: Date },
      reason: { type: String },
      notes: { type: String }
   }],
   clinics: [{ type: Schema.Types.ObjectId, ref: 'Clinic' }]
});

module.exports = mongoose.model('Patient', patientSchema);
