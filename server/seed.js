const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');

const Appointment = require('./models/appointment');
const Clinic = require('./models/clinic');
const Doctor = require('./models/doctor');
const Patient = require('./models/patient');
const User = require('./models/user');

async function seedDoctors() {
   const doctors = [];
   for (let i = 0; i < 4; ++i) {
      const newDoctor = await Doctor.create({
         name: faker.person.fullName(),
         email: faker.internet.email(),
         specialization: faker.helpers.arrayElement(['Cardiology', 'Dermatology', 'Oncology', 'Vascular']),
         phoneNumber: faker.phone.number(),
      });
      doctors.push(newDoctor);
   }
   return doctors;
}

async function seedUsers() {
   console.log('Seeding users...');

   const users = [];
   // create admin user to be used on each run
   const admin = await User.create({
      name: 'Admin User',
      email: 'test@example.com',
      encryptedPassword: await bcrypt.hash('password123', parseInt(process.env.PASSWORD_SALT) || 10),
      role: 'admin',
   });
   users.push(admin);

   let numDoctors = 0;
   for (let i = 1; i < 10; ++i) {
      console.log('Creating user: ', i);
      const f_name = faker.person.fullName();
      const email = faker.internet.email();
      const password = faker.internet.password();
      const encryptedPassword = await bcrypt.hash(password, parseInt(process.env.PASSWORD_SALT) || 10);
      let f_role = faker.helpers.arrayElement(['doctor', 'user']);
      if (numDoctors < 2 && i > 8) {
         f_role = 'doctor';
      }

      const newUser = await User.create({
         name: f_name,
         email: email,
         encryptedPassword: encryptedPassword,
         role: f_role,
      });
      if (f_role === 'doctor') {
         ++numDoctors;
      }
      users.push(newUser);

   }
   return users;
}

async function seedClinics() {
   const clinics = [];
   for (let i = 0; i < 2; ++i) {
      const newClinic = await Clinic.create({
         name: faker.company.name(),
         address: faker.location.streetAddress(),
         phoneNumber: faker.phone.number(),
         doctors: [],
         users: [],
      });
      clinics.push(newClinic);
   }
   return clinics;
}

async function seedPatients(clinics, doctors) {
   const patients = [];
   for (let i = 0; i < 30; i++) {
      const newPatient = await Patient.create({
         name: faker.person.fullName(),
         email: faker.internet.email(),
         phoneNumber: faker.phone.number(),
         gender: faker.helpers.arrayElement(['Male', 'Female']),
         primaryPhysician: faker.helpers.arrayElement(doctors)._id,
         medicalHistory: faker.helpers.arrayElements(['Diabetes', 'High blood pressure', 'Asthma'], 2),
         appointments: [
            {
               date: faker.date.future(),
               reason: faker.lorem.sentence(),
               notes: faker.lorem.paragraph(),
            },
         ],
         clinics: [faker.helpers.arrayElement(clinics)._id],
      });
      patients.push(newPatient);
   }
   return patients;
}

async function seedAppointments(doctors, patients, users) {
   for (let i = 0; i < 30; i++) {
      await Appointment.create({
         date: faker.date.future(),
         createdBy: users[0]._id, // Admin
         patient: faker.helpers.arrayElement(patients)._id,
         doctor: faker.helpers.arrayElement(doctors)._id,
         reason: faker.lorem.sentence(),
         notes: faker.lorem.paragraph(),
      });
   }
}

const seedData = async () => {
   try {
      // Remove all existing data
      await User.deleteMany({});
      await Doctor.deleteMany({});
      await Patient.deleteMany({});
      await Clinic.deleteMany({});
      await Appointment.deleteMany({});
      console.log('Existing data cleared!');

      // Create users
      const users = await seedUsers();
      console.log('Users seeded:', users.length);

      // Create doctors
      const doctors = await seedDoctors();
      console.log('Doctors seeded:', doctors.length);

      // Create clinics
      const clinics = await seedClinics();
      console.log('Clinics seeded:', clinics.length);

      // Create patients
      const patients = await seedPatients(clinics, doctors);
      console.log('Patients seeded:', patients.length);

      // Create appointments
      await seedAppointments(doctors, patients, users);

      console.log('Appointments seeded');

      console.log('Data seeding complete!');
   } catch (error) {
      console.error('Error seeding data:', error);
      process.exit(1); // Exit with failure
   }
};

module.exports = seedData;
