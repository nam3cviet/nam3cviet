# YouTube Upload Tool — Mobile

An Expo (React Native) app for uploading videos to your YouTube channel from
your phone: pick a video, set title/description/tags/privacy/thumbnail, sign
in with Google, and watch upload progress live. It talks to the
[`youtube-upload-tool`](../youtube-upload-tool) backend — it does not embed
any Google credentials itself.

## How sign-in works

Google doesn't let a shared app like Expo Go register a custom URL scheme for
OAuth redirects, so this app doesn't talk to Google directly. Instead:

1. The app opens a system browser to the backend's `/auth/google` endpoint.
2. The backend runs the normal OAuth exchange with Google (it holds the
   client secret) and, for mobile, generates a short-lived one-time pairing
   code instead of setting a cookie.
3. The backend redirects the browser back into the app via an Expo deep
   link carrying that pairing code.
4. The app exchanges the pairing code for a bearer session token
   (`POST /api/mobile/session`), stores it in `expo-secure-store`, and sends
   it as `Authorization: Bearer …` on all upload requests.

This keeps the OAuth client secret server-side, where it belongs.

## Prerequisites

- The `youtube-upload-tool` backend set up and running (see its README) —
  including real Google OAuth credentials in its `.env`.
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
- Your phone able to reach the backend over the network. `localhost` will
  **not** work from a physical device. Two options:
  - **Same Wi-Fi**: run the backend on your computer, find its LAN IP
    (e.g. `192.168.1.10`), use `http://<that-ip>:3000`.
  - **Different networks / can't use LAN**: tunnel the backend, e.g.
    `npx localtunnel --port 3000` or `ngrok http 3000`, and use the
    HTTPS URL it gives you.

## Setup

```bash
cp .env.example .env
# edit .env: EXPO_PUBLIC_BACKEND_URL=<url your phone can reach>

npm install
npx expo start
```

Scan the QR code with Expo Go (iOS: Camera app; Android: Expo Go's scanner).

If your phone and computer aren't on the same network, run
`npx expo start --tunnel` instead so Expo Go can reach the dev server too.

## Using the app

1. Tap **Sign in with Google**, complete the consent screen in the browser
   that opens, and you'll be dropped back into the app automatically.
2. Choose a video file, fill in title/description/tags/privacy, optionally
   pick a thumbnail image.
3. Tap **Upload**. Two progress bars track the phone→backend transfer and
   the backend→YouTube publish; a link to the video appears when it's done.

## Notes / limitations

- Bearer sessions and pairing codes live in the backend's memory only —
  restarting the backend signs everyone out and invalidates in-flight
  pairing codes.
- For anything beyond your own local testing, put the backend behind HTTPS;
  plain `http://<lan-ip>` is fine for development on a trusted network only.
- The deep-link redirect (`Linking.createURL`) resolves to `exp://…` while
  running in Expo Go. If you later build a standalone/dev-client app, it
  will resolve to `youtubeuploader://…` (the `scheme` set in `app.json`)
  automatically — no code changes needed.
