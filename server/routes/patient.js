const Patient = require('../models/patient');
const express = require('express');
const authenticateJWT = require('../middlewares/authMiddleware');
const router = express.Router();

// Create a new patient
router.post('/patients', authenticateJWT, async (req, res) => {
   try {
      // NOSQL Injection Vulnerability
      // use validation middleware to prevent this
      // Currently, middleware just checks if the token is valid, not the data
      const patient = new Patient(req.body);
      await patient.save();
      res.status(201).json(patient);
   } catch (error) {
      res.status(400).json({ message: 'Error creating patient', error });
   }
});

// Get all patients
router.get('/patients', authenticateJWT, async (req, res) => {
   console.log("GETTING ALL PATIENTS");
   try {
      const patients = await Patient.find({});
      res.status(200).json(patients);
   } catch (error) {
      res.status(500).json({ message: 'Error retrieving patients', error });
   }
});

module.exports = router;
