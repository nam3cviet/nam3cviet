import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from './config';

const TOKEN_KEY = 'youtube_upload_session_token';

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  const token = await getStoredToken();
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  if (token) {
    fetch(`${BACKEND_URL}/api/mobile/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
}

export async function signIn(): Promise<{ ok: true } | { ok: false; error: string }> {
  const redirectUri = Linking.createURL('auth-callback');
  const authUrl = `${BACKEND_URL}/auth/google?mobile_redirect=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Sign-in was cancelled.' };
  }

  const { queryParams } = Linking.parse(result.url);
  const pairing = queryParams?.pairing;
  const oauthError = queryParams?.error;

  if (oauthError) {
    return { ok: false, error: String(oauthError) };
  }
  if (!pairing) {
    return { ok: false, error: 'Sign-in did not return a pairing code.' };
  }

  const response = await fetch(`${BACKEND_URL}/api/mobile/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairing }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error || 'Could not complete sign-in.' };
  }

  const { token } = await response.json();
  await storeToken(token);
  return { ok: true };
}
