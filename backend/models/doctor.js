const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    cpsonumber: { type: String, required: true, unique: true },
    specialties: { type: [String], required: false, default: [] },
    primaryaddressnotinpractice: { type: Boolean, default: false },
    street1: { type: String, required: true },
    street2: { type: String },
    street3: { type: String },
    street4: { type: String },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalcode: { type: String, required: true },
    phonenumber: { type: String },
    fax: { type: String },
    additionaladdresscount: { type: Number, default: 0 },
    registrationstatus: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    mostrecentformername: { type: String },
    registrationstatuslabel: { type: String, enum: ['active', 'inactive'], default: 'active' },
    importedAt: { type: Date, default: Date.now },
    additionaladdresses: [
        {
            street1: { type: String, required: true },
            street2: { type: String },
            street3: { type: String },
            street4: { type: String },
            city: { type: String, required: true },
            province: { type: String, required: true },
            postalcode: { type: String, required: true },
            phones: [{ type: String }],
            faxes: [{ type: String }],
        }
    ],
    // boolean for if the doctor was in the mailing list before
    inMailinglist: { type: Boolean, default: false },
});

// create an index on postalcode for fast lookups
doctorSchema.index({ postalcode: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
