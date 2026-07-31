# Deploying to a Hostinger VPS

This deploys the `youtube-upload-tool` backend to a VPS, behind Nginx with a
free Let's Encrypt certificate, running as a systemd service. Once it's live
at a real HTTPS domain, both the web app and the `youtube-upload-mobile`
app can point at it — no tunnel needed.

## Prerequisites

1. **A Hostinger VPS** with SSH access (root, or a user with `sudo`). Find
   your VPS's IP address and SSH credentials in hPanel → VPS → your server.
2. **A domain or subdomain** pointed at that VPS's IP. Google OAuth and
   HTTPS both require a real domain — a bare IP address won't work.
   - In Hostinger hPanel → Domains → DNS / Name Servers, add an **A
     record** for the (sub)domain you want (e.g. `upload`) pointing at your
     VPS's IP address. Propagation is usually fast but can take up to a
     few hours.
3. **Google OAuth credentials** for this domain — see below (you'll finish
   this step *after* the deploy script prints the exact redirect URI to
   register, since it depends on your domain).

## 1. Deploy

SSH into your VPS, then:

```bash
sudo git clone --branch main https://github.com/nam3cviet/nam3cviet.git /opt/nam3cviet
cd /opt/nam3cviet
sudo DOMAIN=upload.yourdomain.com EMAIL=you@example.com bash deploy/deploy.sh
```

Replace `upload.yourdomain.com` with your actual domain and `EMAIL` with an
address for Let's Encrypt renewal notices (or drop the `EMAIL=` var
entirely to skip it).

> If [PR #2](https://github.com/nam3cviet/nam3cviet/pull/2) hasn't been
> merged to `main` yet, add `BRANCH=claude/youtube-upload-tool-csr-px3qh8`
> to the command above so you deploy the branch that actually has this app.

The script is safe to re-run — it installs Node.js/Nginx/Certbot only if
missing, and re-running it later pulls the latest code and restarts the
service.

What it does:
- Installs Node.js 20, Nginx, and Certbot if not already present
- Creates a dedicated, unprivileged `youtube-upload` system user
- Clones the repo into `/opt/nam3cviet` (or updates it, on re-runs)
- Installs dependencies and creates `youtube-upload-tool/.env` from the
  example file (with a random `SESSION_SECRET` and the correct
  `GOOGLE_REDIRECT_URI` already filled in)
- Sets up a systemd service (`youtube-upload-tool`) so it starts on boot
  and restarts if it crashes
- Configures Nginx as a reverse proxy (with the long timeouts and
  unbuffered streaming that large video uploads and the live progress
  bar need)
- Requests an HTTPS certificate from Let's Encrypt for your domain

## 2. Create the Google OAuth client

The script's final output includes the exact redirect URI to use — it's
`https://<your-domain>/auth/google/callback`.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or
   pick a project and enable the **YouTube Data API v3**.
2. Configure the OAuth consent screen (External is fine; add your own
   Google account as a test user if the app is unpublished).
3. Create an **OAuth client ID** of type **Web application**, and add the
   redirect URI above as an "Authorized redirect URI".
4. Copy the Client ID and Client Secret.

## 3. Fill in credentials and restart

```bash
sudo nano /opt/nam3cviet/youtube-upload-tool/.env
# set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

sudo systemctl restart youtube-upload-tool
sudo systemctl status youtube-upload-tool
```

Visit `https://<your-domain>` — you should see the sign-in screen, and be
able to sign in and upload a video end to end.

## 4. Point the mobile app at it

In `youtube-upload-mobile/.env`:

```
EXPO_PUBLIC_BACKEND_URL=https://<your-domain>
```

Then `npm install && npx expo start` as usual and scan the QR code with
Expo Go — see `youtube-upload-mobile/README.md`.

## Operating it

- **Logs**: `journalctl -u youtube-upload-tool -f`
- **Restart**: `sudo systemctl restart youtube-upload-tool`
- **Redeploy after new commits**: re-run the same deploy command from
  step 1 (from any directory — it always operates on `/opt/nam3cviet`
  unless you override `APP_DIR`)
- **Firewall**: make sure ports 80 and 443 are open (Hostinger VPS
  firewall, in hPanel → VPS → Firewall, or `ufw allow 80,443/tcp` if
  you're managing `ufw` yourself)

## Notes

- Sessions (web) and bearer tokens (mobile) are kept in the Node
  process's memory, matching the local dev setup — restarting the
  service signs everyone out. Fine for personal use; if you need
  sessions to survive restarts, swap in a persistent session/token
  store.
- `.env` is created `chmod 600`, owned by the dedicated `youtube-upload`
  system user — keep your real Client Secret out of git.
