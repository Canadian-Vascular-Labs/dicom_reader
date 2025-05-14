// Load environment variables
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// Initialize the Express app
const app = express();

const allowed = [
    process.env.ORIGIN_DEV,
    process.env.ORIGIN_PROD
];

app.use(cors({
    origin: allowed,
    credentials: true,                 // allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // optionsSuccessStatus: 204      // optional: some old browsers want 204 instead of 200
}));

// then the rest of your middleware & routes…
app.use(helmet());
app.use(bodyParser.json());
app.use(morgan('dev'));

// Import routes
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctor');

app.use('/api/auth', authRoutes);
app.use('/api', doctorRoutes);


// Import DB connection
const connectDB = require('./config/db');
// Connect to the database
connectDB();

// Seed the database with dummy data
if (process.env.NODE_ENV === 'development') {
    const seedData = require('./seed.cjs');
    seedData();
}

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
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


