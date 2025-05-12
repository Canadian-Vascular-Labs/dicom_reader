const bcrypt = require('bcryptjs');

const Doctor = require('./models/doctor');
const User = require('./models/user');
// import-doctors.js

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

async function seedDoctors() {
    console.log('Seeding doctors...');
    var total_doctors = 0;
    // 1) Connect to MongoDB
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 2) Find all .json files in the extracted_data folder
    const dataDir = path.join(__dirname, '../..', 'cpso-doctor-extractor', 'extracted_data');
    const files = await fs.readdir(dataDir);
    for (const file of files.filter(f => f.endsWith('.json'))) {
        const filePath = path.join(dataDir, file);
        // 'R1A.json'
        // check if the file is not 'R1A.json' (file contains the entire path)
        // if (!filePath.includes('R1A.json')) {
        // if (!filePath.includes('L3Y.json')) {
        //     continue;
        // }
        console.log(`→ Processing ${filePath}`);

        // 3) Read & parse it
        const txt = await fs.readFile(filePath, 'utf8');
        const block = JSON.parse(txt);

        // 4) Flatten { postal: [ docs ] } → [ docObject, … ]
        const batch = [];
        for (const [postal, docs] of Object.entries(block)) {
            for (const d of docs) {
                batch.push({
                    name: d.name,
                    cpsonumber: d.cpsonumber,
                    specialties: d.specialties,
                    primaryaddressnotinpractice: d.primaryaddressnotinpractice,
                    street1: d.street1,
                    street2: d.street2,
                    street3: d.street3,
                    street4: d.street4,
                    city: d.city,
                    province: d.province,
                    postalcode: d.postalcode.trim().toUpperCase(),
                    phonenumber: d.phonenumber,
                    fax: d.fax,
                    additionaladdresscount: d.additionaladdresscount,
                    registrationstatus: d.registrationstatus,
                    mostrecentformername: d.mostrecentformername,
                    registrationstatuslabel: d.registrationstatuslabel,
                    importedAt: new Date(),
                    // if you want to populate nested additionaladdresses:
                    additionaladdresses: d.additionaladdresses || []
                });
            }
        }
        // update total number of doctors
        total_doctors += batch.length;

        if (batch.length === 0) {
            console.log(`⚠️  No doctors found in ${file}`);
            continue;
        }

        // 5) Bulk insert (skipping duplicates via ordered:false)
        try {
            const res = await Doctor.insertMany(batch, { ordered: false });
            console.log(`✅ Inserted ${res.length} docs from ${file}`);
        } catch (err) {
            console.warn(`⚠️  Some errors inserting ${file}:`, err.message);
        }
    }
    console.log(`✅ Doctors successfully seeded -- ${total_doctors} doctors in total`);
}


async function seedUsers() {
    console.log('Seeding users...');

    const users = [];
    // create admin user to be used on each run
    const admin = await User.create({
        name: 'Admin User',
        email: 'test@example.com',
        encryptedPassword: await bcrypt.hash(`${process.env.ADMIN_PASSOWRD}`, parseInt(process.env.PASSWORD_SALT) || 10),
        role: 'admin',
    });
    users.push(admin);
    console.log('Admin user created:', admin);

    return users;
}


const seedData = async () => {
    try {
        // Remove all existing data
        // await User.deleteMany({});
        // console.log('Existing USER data cleared!');

        // Create users
        // const users = await seedUsers();
        // console.log('Users seeded:', users.length);

        // await Doctor.deleteMany({});
        // console.log('Existing DOCTOR data cleared!');
        // // Create doctors
        // seedDoctors()
        //     .catch(err => {
        //         console.error('❌ Seed failed:', err);
        //         process.exit(1);
        //     });

        console.log('Data seeding complete!');
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1); // Exit with failure
    }
};

module.exports = seedData;
