// The backend from youtube-upload-tool/, reachable from your phone (not
// "localhost" — see the README for how to expose it during development).
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
