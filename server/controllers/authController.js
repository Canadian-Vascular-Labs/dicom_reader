// CORE LOGIC FOR AUTHENTICATION
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.loginUser = async (req, res) => {
    console.log("ATTEMPTING TO LOGIN USER");
    const { email, password } = req.body;

    try {

        // MAKE SURE TO HASH THE PASSWORD BEFORE STORING IN THE DATABASE
        // ADD ENV VAR TO THESE VALUES TO ENCRYPT THEM

        user = await User.findOne({ email });
        if (!user) {
            // console.log('User not found: ', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // console.log('User found: ', user);

        // need to apply the salt to the password before comparing
        const isMatch = await bcrypt.compare(password, user.encryptedPassword);
        if (!isMatch) {
            // console.log('Invalid credentials: ', email, password);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // res.cookie('token', token, {
        //    httpOnly: true, // Prevents access via client-side JavaScript
        //    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        //    maxAge: 86400000, // Token expires in 1 day
        // });

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error logging in user: ', error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.logoutUser = async (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logout successful' });
};