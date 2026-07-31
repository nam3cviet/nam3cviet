require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const mobileAuthRoutes = require('./routes/mobileAuth');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

// Native apps aren't subject to CORS, but this keeps /api usable from a
// browser-based client (e.g. `expo start --web`) during development too.
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/auth', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api/mobile', mobileAuthRoutes);

app.get('/api/session', (req, res) => {
  res.json({ authenticated: !!req.session.tokens });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`YouTube upload tool listening on http://localhost:${PORT}`);
});
