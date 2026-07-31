const express = require('express');
const { SCOPES, createOAuth2Client } = require('../lib/googleClient');
const {
  beginMobileAuth,
  consumeMobileAuthState,
  createPairingCode,
} = require('../lib/mobileSessions');

const router = express.Router();

// Only hand the browser back to an app-controlled redirect (never an
// arbitrary open redirect) by requiring one of our own registered schemes.
const ALLOWED_MOBILE_REDIRECT_PREFIXES = ['exp://', 'exp+', 'youtubeuploader://'];

function isAllowedMobileRedirect(url) {
  return ALLOWED_MOBILE_REDIRECT_PREFIXES.some((prefix) => url.startsWith(prefix));
}

router.get('/google', (req, res) => {
  const oauth2Client = createOAuth2Client();
  const { mobile_redirect: mobileRedirect } = req.query;

  let state;
  if (mobileRedirect) {
    if (!isAllowedMobileRedirect(mobileRedirect)) {
      return res.status(400).send('Invalid mobile_redirect.');
    }
    state = beginMobileAuth(mobileRedirect);
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    ...(state ? { state } : {}),
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  const mobileAuth = state ? consumeMobileAuthState(state) : null;
  const failureTarget = mobileAuth ? mobileAuth.mobileRedirect : '/';

  if (error) {
    return res.redirect(`${failureTarget}?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${failureTarget}?error=missing_code`);
  }
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (mobileAuth) {
      const pairing = createPairingCode(tokens);
      return res.redirect(`${mobileAuth.mobileRedirect}?pairing=${pairing}`);
    }

    req.session.tokens = tokens;
    res.redirect('/');
  } catch (err) {
    console.error('OAuth callback failed:', err.message);
    res.redirect(`${failureTarget}?error=${encodeURIComponent('auth_failed')}`);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
