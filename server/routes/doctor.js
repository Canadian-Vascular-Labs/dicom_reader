const Doctor = require('../models/doctor');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const router = express.Router();

// Create a new doctor
router.post('/doctors', authenticateJWT, async (req, res) => {
   try {
      // NOSQL Injection Vulnerability
      // use validation middleware to prevent this
      const doctor = new Doctor(req.body);
      await doctor.save();
      res.status(201).json(doctor);
   } catch (error) {
      res.status(400).json({ message: 'Error creating doctor', error });
   }
});

// Get all doctors
router.get('/doctors', authenticateJWT, async (req, res) => {
   try {
      console.log("Retrieving doctors");
      const doctors = await Doctor.find({});
      res.status(200).json(doctors);
   } catch (error) {
      res.status(500).json({ message: 'Error retrieving doctors', error });
   }
});

module.exports = router;