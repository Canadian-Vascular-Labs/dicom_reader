// https://drawsql.app/templates/timegrid
// import 

const mongoose = require('mongoose');

const { MONGO_URI } = require('./config')
const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB with URI:', MONGO_URI);
        await mongoose.connect(MONGO_URI, {
            dbName: process.env.DB_NAME,

        });
        console.log('✅ Connected to MongoDB : ', mongoose.connection.db.databaseName);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit with failure
    }
};

module.exports = connectDB;