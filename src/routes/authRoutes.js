const express = require('express');
const {
  signup,
  login,
  googleLogin,
  googleClientId
} = require('../controllers/authController');

const router = express.Router();

// Auth
router.post('/signup', signup);
router.post('/login', login);

// Google
router.post('/google', googleLogin); // ✅ main route
router.get('/google/client-id', googleClientId);

module.exports = router;
