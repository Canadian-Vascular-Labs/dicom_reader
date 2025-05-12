// Basic JWT authentication middleware to verify the token sent by the client. This middleware will be used to protect routes that require authentication
// Protects Patient/Doctor routes
// Token issued by the server (auth controller) is sent in the Authorization header 

const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // remove 'Bearer' from token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  }
  else {
    return res.status(401).json({ message: 'Access denied. Authorization header is required' });
  }
};

module.exports = authenticateJWT;


