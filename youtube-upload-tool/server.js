require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

app.use('/auth', authRoutes);
app.use('/api', uploadRoutes);

app.get('/api/session', (req, res) => {
  res.json({ authenticated: !!req.session.tokens });
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`YouTube upload tool listening on http://localhost:${PORT}`);
});
