const express = require('express');
const {
  redeemPairingCode,
  createMobileSession,
  revokeMobileSession,
} = require('../lib/mobileSessions');

const router = express.Router();

router.use(express.json());

router.post('/session', (req, res) => {
  const { pairing } = req.body || {};
  if (!pairing) {
    return res.status(400).json({ error: 'Missing pairing code.' });
  }
  const tokens = redeemPairingCode(pairing);
  if (!tokens) {
    return res.status(400).json({ error: 'Pairing code is invalid or expired.' });
  }
  const token = createMobileSession(tokens);
  res.json({ token });
});

router.post('/logout', (req, res) => {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (bearer) revokeMobileSession(bearer);
  res.json({ ok: true });
});

module.exports = router;
