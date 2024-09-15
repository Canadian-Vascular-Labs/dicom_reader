const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clinicSchema = new Schema({
   name: { type: String, required: true },
   address: { type: String, required: true },
   phoneNumber: { type: String, required: true },
   doctors: [{ type: Schema.Types.ObjectId, ref: 'Doctor' }],
   users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Clinic', clinicSchema);