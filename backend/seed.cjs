const connectDB = require('./config/db');
const bcrypt = require('bcryptjs');
const Doctor = require('./models/doctor');
const User = require('./models/user');
// import-doctors.js

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const mongoose = require('mongoose');

async function seedDoctors() {
    console.log('Seeding doctors()...');
    var total_doctors = 0;

    // 2) Find all .json files in the extracted_data folder
    const dataDir = path.join(__dirname, '../..', 'cpso-doctor-extractor', 'extracted_data');
    console.log(`Searching for JSON files in ${dataDir}`);
    const files = await fs.readdir(dataDir);
    console.log(`Found ${files.length} files in ${dataDir}`);
    for (const file of files.filter(f => f.endsWith('.json'))) {
        // if (file !== 'M1H.json') {
        //     // console.log(`⚠️  Skipping ${file}`);
        //     continue;
        // }
        const filePath = path.join(dataDir, file);
        console.log(`→ Processing ${filePath}`);

        // 3) Read & parse it
        const txt = await fs.readFile(filePath, 'utf8');
        const block = JSON.parse(txt);

        // 4) Flatten { postal: [ docs ] } → [ docObject, … ]
        const batch = [];
        // print total number of keys (CPSONumbers in file)
        const num_proposed_entries = Object.entries(block).length;
        for (CPSO_Number of Object.entries(block)) {
            const d = CPSO_Number[1];
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
                additionaladdresses: d.additionaladdresses || [],
                inMailinglist: d.inMailinglist || false,
            });
        }
        if (batch.length === 0) {
            console.log(`⚠️  No doctors found in ${file}`);
            continue;
        }

        // 5) Bulk insert (skipping duplicates via ordered:false)
        try {
            // simple version: returns an array of docs
            const docs = await Doctor.insertMany(batch, { ordered: false });
            console.log(`✅ Inserted ${docs.length} docs from ${file}`);
            // update total number of doctors
            total_doctors += docs.length;

            if (docs.length !== num_proposed_entries) {
                console.warn(`⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️  ${num_proposed_entries - docs.length} entry skipped`);
            }

        } catch (err) {
            console.error('Bulk insert threw an unexpected error:', err);

            // pull out whatever place Mongoose/Mongo put the per-doc failures
            const writeErrs =
                err.writeErrors ||
                (err.result && err.result.writeErrors) ||
                (err.err && err.err.writeErrors) ||
                [];

            if (writeErrs.length) {
                console.warn(`⚠️  ${writeErrs.length} docs failed to insert:`);
                writeErrs.forEach(e => {
                    console.warn(
                        ` • index=${e.index}  errmsg=${e.errmsg || e.err.message}`
                    );
                });
            } else {
                console.warn('⚠️  No writeErrors array found; full error above.');
            }
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
        console.log('⛓️ Model is bound to DB:', Doctor.db.databaseName);

        // Remove all existing data
        await User.deleteMany({});
        console.log('Existing USER data cleared!');

        // Create users
        const users = await seedUsers();
        console.log('Users seeded:', users.length);

        await Doctor.deleteMany({});
        console.log('Existing DOCTOR data cleared!');
        // Create doctors
        await seedDoctors()
            .catch(err => {
                console.error('❌ Seed failed:', err);
                process.exit(1);
            });

        console.log('Data seeding complete!');


        // process.exit(1);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1); // Exit with failure
    }
};

module.exports = seedData;


// if this script is run directly, seed the database
if (require.main === module) {
    (async () => {
        try {
            console.log('Connecting to MongoDB…');
            await connectDB();

            console.log('Seeding database…');
            await seedData();

            console.log('Seeding complete!');
        } catch (err) {
            console.error('Seeding failed:', err);
            process.exit(1);
        } finally {
            // Close the connection
            await mongoose.connection.close();
            console.log('MongoDB connection closed.');
            process.exit(0);
        }
    })();
}