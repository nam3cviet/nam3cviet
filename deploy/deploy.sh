#!/usr/bin/env bash
# Deploys youtube-upload-tool (the backend) to a fresh or existing Debian/Ubuntu
# VPS: installs Node.js/Nginx/Certbot as needed, clones the repo, sets up a
# systemd service, an Nginx reverse proxy, and an HTTPS certificate.
#
# Usage (as root, via SSH on the VPS):
#   DOMAIN=upload.yourdomain.com EMAIL=you@example.com ./deploy.sh
#
# Safe to re-run: pulls the latest code and restarts the service each time.
set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=upload.yourdomain.com ./deploy.sh}"
EMAIL="${EMAIL:-}"
REPO_URL="${REPO_URL:-https://github.com/nam3cviet/nam3cviet.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/nam3cviet}"
SERVICE_USER="${SERVICE_USER:-youtube-upload}"
PORT="${PORT:-3000}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root (e.g. via sudo)." >&2
  exit 1
fi

echo "==> Installing Node.js (if needed)"
if ! command -v node >/dev/null || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Installing Nginx and Certbot (if needed)"
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git

echo "==> Creating service user ($SERVICE_USER)"
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin "$SERVICE_USER"
fi

echo "==> Fetching code into $APP_DIR (branch: $BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR/youtube-upload-tool"

echo "==> Installing dependencies"
npm ci --omit=dev

echo "==> Ensuring .env exists"
if [ ! -f .env ]; then
  cp .env.example .env
  SESSION_SECRET="$(openssl rand -hex 32)"
  sed -i "s#^SESSION_SECRET=.*#SESSION_SECRET=${SESSION_SECRET}#" .env
  sed -i "s#^GOOGLE_REDIRECT_URI=.*#GOOGLE_REDIRECT_URI=https://${DOMAIN}/auth/google/callback#" .env
  sed -i "s#^PORT=.*#PORT=${PORT}#" .env
  echo "    Created .env — you still need to fill in GOOGLE_CLIENT_ID and"
  echo "    GOOGLE_CLIENT_SECRET (see the printed instructions at the end)."
else
  echo "    .env already exists, leaving it as-is."
fi

mkdir -p tmp-uploads
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR/youtube-upload-tool"
chmod 600 .env

echo "==> Installing systemd service"
sed \
  -e "s#__SERVICE_USER__#${SERVICE_USER}#g" \
  -e "s#__APP_DIR__#${APP_DIR}#g" \
  "$APP_DIR/deploy/youtube-upload-tool.service.template" \
  > /etc/systemd/system/youtube-upload-tool.service
systemctl daemon-reload
systemctl enable youtube-upload-tool

echo "==> Installing Nginx site config"
sed \
  -e "s#__DOMAIN__#${DOMAIN}#g" \
  -e "s#__PORT__#${PORT}#g" \
  "$APP_DIR/deploy/nginx.conf.template" \
  > "/etc/nginx/sites-available/youtube-upload-tool"
ln -sf "/etc/nginx/sites-available/youtube-upload-tool" "/etc/nginx/sites-enabled/youtube-upload-tool"
nginx -t
systemctl reload nginx

echo "==> Starting the app"
systemctl restart youtube-upload-tool

echo "==> Requesting HTTPS certificate for $DOMAIN"
echo "    (make sure $DOMAIN's DNS A record already points at this server's IP)"
if [ -n "$EMAIL" ]; then
  certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos -m "$EMAIL"
else
  certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos --register-unsafely-without-email
fi
systemctl reload nginx

cat <<EOF

==> Done.

Next steps:
1. In Google Cloud Console, add this OAuth redirect URI to your client:
     https://${DOMAIN}/auth/google/callback
2. Edit ${APP_DIR}/youtube-upload-tool/.env and fill in:
     GOOGLE_CLIENT_ID=...
     GOOGLE_CLIENT_SECRET=...
3. Restart the app: systemctl restart youtube-upload-tool
4. Check it's healthy: systemctl status youtube-upload-tool
   Logs: journalctl -u youtube-upload-tool -f
5. Visit https://${DOMAIN} in a browser to test the web app.
6. For the mobile app, set EXPO_PUBLIC_BACKEND_URL=https://${DOMAIN} in
   youtube-upload-mobile/.env and run it as usual (see its README).

To redeploy after future pushes to $BRANCH, just re-run this script.
EOF
