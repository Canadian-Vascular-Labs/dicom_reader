// Load environment variables
require('dotenv').config({ path: '.env' });

// Import required modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctor');

// Import DB connection
const connectDB = require('./config/db');

// Initialize the Express app
const app = express();

// Connect to the database
connectDB();

// Seed the database with dummy data
if (process.env.NODE_ENV === 'development') {
    const seedData = require('./seed');
    seedData();
}



// Apply middleware
app.use(helmet());               // Security headers
const corsOptions = {
    origin: `http://localhost:${process.env.FRONT_END_PORT}`, // React frontend
    credentials: true, // Allow credentials (cookies)
};
app.use(cors(corsOptions));      // Enable CORS
app.use(bodyParser.json());      // Parse incoming JSON requests
app.use(morgan('dev'));          // Logger for HTTP requests

// API Routes
app.use('/api/auth', authRoutes);          // Authentication routes
app.use('/api', doctorRoutes);              // Doctor routes

// Default route (root)
app.get('/', (req, res) => {
    res.send('Welcome to the DICOM Reader API');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


