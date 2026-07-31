const express = require('express');
const { SCOPES, createOAuth2Client } = require('../lib/googleClient');

const router = express.Router();

router.get('/google', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect('/?error=' + encodeURIComponent(error));
  }
  if (!code) {
    return res.redirect('/?error=missing_code');
  }
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;
    res.redirect('/');
  } catch (err) {
    console.error('OAuth callback failed:', err.message);
    res.redirect('/?error=' + encodeURIComponent('auth_failed'));
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
