const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { createUser, createGoogleUser, findUserByEmail, findUserByGoogleId } = require('../models/userModel');
const { pool } = require('../config/db');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= JWT =================
function signToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ================= SIGNUP =================
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await createUser({ name, email, passwordHash: hash });

    const token = signToken(user);

    res.status(201).json({ token, user });

  } catch (err) {
    next(err);
  }
}

// ================= LOGIN =================
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ message: 'Use Google login for this account' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    delete user.password_hash;

    const token = signToken(user);

    res.json({ token, user });

  } catch (err) {
    next(err);
  }
}

// ================= GOOGLE LOGIN =================
async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'credential is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google login not configured' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || 'Drive User';
    const avatarUrl = payload.picture || null;

    let user = await findUserByGoogleId(googleId);

    // If not found, check by email
    if (!user) {
      const existing = await findUserByEmail(email);

      if (existing) {
        // Link Google account if not linked
        if (!existing.google_id) {
          await pool.query(
            `UPDATE users SET google_id = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $1`,
            [existing.id, googleId, avatarUrl]
          );
        }
        user = await findUserByEmail(email);
      } else {
        user = await createGoogleUser({ name, email, googleId, avatarUrl });
      }
    }

    delete user.password_hash;

    const token = signToken(user);

    res.json({ token, user });

  } catch (err) {
    console.error("Google login error:", err);
    next(err);
  }
}

// ================= GOOGLE CLIENT ID =================
function googleClientId(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  console.log("Client ID from ENV:", clientId);

  return res.json({
    clientId: clientId || null
  });
}

// ================= EXPORT =================
module.exports = {
  signup,
  login,
  googleLogin,
  googleClientId
};
