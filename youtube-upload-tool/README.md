# YouTube Upload Tool

A small web app for uploading videos to YouTube using the YouTube Data API v3
and an OAuth2 sign-in flow. Set a title, description, tags, privacy status,
and an optional thumbnail, then watch upload progress in real time.

This backend also powers [`youtube-upload-mobile`](../youtube-upload-mobile),
a React Native app — see that project's README for how it authenticates and
uploads through this same server.

## Setup

### 1. Create OAuth2 credentials

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. Enable the **YouTube Data API v3** (APIs & Services > Library).
3. Configure the OAuth consent screen (External is fine for personal use; add
   your own Google account as a test user if the app is unpublished).
4. Create an **OAuth client ID** of type **Web application**
   (APIs & Services > Credentials).
5. Add an authorized redirect URI, e.g. `http://localhost:3000/auth/google/callback`.
6. Copy the generated Client ID and Client Secret.

### 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_SECRET=some-random-string
PORT=3000
```

### 3. Install and run

```bash
npm install
npm start
```

Open `http://localhost:3000`, sign in with Google, and upload a video.

## How it works

- **Auth**: `/auth/google` redirects to Google's consent screen requesting the
  `youtube.upload` scope; `/auth/google/callback` exchanges the returned code
  for OAuth tokens, stored server-side in the session.
- **Upload**: the browser posts the video (and optional thumbnail) as
  `multipart/form-data` to `/api/upload/:uploadId`. The server streams the
  video to YouTube via `youtube.videos.insert` and reports progress back to
  the browser over Server-Sent Events (`/api/upload/:uploadId/progress`).
- Two progress bars are shown: one for the browser-to-server transfer (via
  `XMLHttpRequest` upload progress events) and one for the server-to-YouTube
  transfer (via SSE, driven by `onUploadProgress` on the YouTube API call).
- Temporary files are written to `tmp-uploads/` and deleted after each
  upload completes or fails.
- **Mobile auth**: `/auth/google?mobile_redirect=<uri>` starts the same
  Google OAuth flow but, on success, redirects to the app's deep link with a
  one-time pairing code instead of setting a cookie. The app exchanges that
  code at `/api/mobile/session` for a bearer token, then calls
  `/api/upload/:uploadId` with `Authorization: Bearer <token>` and polls
  `/api/upload/:uploadId/status` (JSON) instead of using SSE.

## Notes

- Tokens are kept in the session only (in-memory store) — restarting the
  server or the session expiring requires signing in again. No tokens are
  written to disk.
- `access_type=offline` + `prompt=consent` is used so a refresh token is
  issued, though this app does not currently persist tokens across restarts.
- Video size limit is set generously (128 GB) via multer; adjust
  `routes/upload.js` if you want a stricter cap.
