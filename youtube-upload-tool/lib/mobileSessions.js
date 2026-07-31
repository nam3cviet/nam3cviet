const crypto = require('crypto');

const PAIRING_TTL_MS = 2 * 60 * 1000; // pairing codes are single-use and short-lived

// state (oauth) -> { mobileRedirect }
const pendingMobileAuth = new Map();
// pairing code -> { tokens, expiresAt }
const pairingCodes = new Map();
// bearer token -> { tokens }
const mobileSessions = new Map();

function beginMobileAuth(mobileRedirect) {
  const state = crypto.randomUUID();
  pendingMobileAuth.set(state, { mobileRedirect });
  return state;
}

function consumeMobileAuthState(state) {
  const entry = pendingMobileAuth.get(state);
  if (entry) pendingMobileAuth.delete(state);
  return entry;
}

function createPairingCode(tokens) {
  const code = crypto.randomBytes(24).toString('hex');
  pairingCodes.set(code, { tokens, expiresAt: Date.now() + PAIRING_TTL_MS });
  return code;
}

function redeemPairingCode(code) {
  const entry = pairingCodes.get(code);
  if (!entry) return null;
  pairingCodes.delete(code);
  if (entry.expiresAt < Date.now()) return null;
  return entry.tokens;
}

function createMobileSession(tokens) {
  const token = crypto.randomBytes(32).toString('hex');
  mobileSessions.set(token, { tokens });
  return token;
}

function getMobileSessionTokens(bearerToken) {
  const entry = mobileSessions.get(bearerToken);
  return entry ? entry.tokens : null;
}

function revokeMobileSession(bearerToken) {
  mobileSessions.delete(bearerToken);
}

module.exports = {
  beginMobileAuth,
  consumeMobileAuthState,
  createPairingCode,
  redeemPairingCode,
  createMobileSession,
  getMobileSessionTokens,
  revokeMobileSession,
};
