// Route uses the loginUser function from the authController.js file to handle the login logic
// authenticateJWT middleware not used here since this is the login route

// ENDPOINT: /api/auth/login?
const express = require('express');
const { loginUser } = require('../controllers/authController');
const { logoutUser } = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);

module.exports = router;
