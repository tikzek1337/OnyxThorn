#!/usr/bin/env bash
# OnyxThorn sync server — one-shot VPS bootstrap.
#
# Usage (as root on a Debian/Ubuntu VPS):
#   ./install.sh sync.example.com you@example.com
#
# The two args are the public hostname and an email address for Let's Encrypt.

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "usage: $0 sync.example.com you@example.com"
  exit 1
fi

INSTALL_DIR="/opt/onyxthorn-sync"
DATA_DIR="/var/lib/onyxthorn-sync"
SERVICE_USER="onyxthorn"

echo "==> Installing system deps..."
apt-get update -y
apt-get install -y python3 python3-venv python3-pip git nginx certbot python3-certbot-nginx \
                   build-essential libffi-dev libssl-dev pkg-config

if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "==> Creating service user $SERVICE_USER"
  useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

install -d -o "$SERVICE_USER" -g "$SERVICE_USER" "$INSTALL_DIR" "$DATA_DIR"

echo "==> Copying source..."
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cp -r "$SOURCE_DIR"/. "$INSTALL_DIR/"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

echo "==> Creating virtualenv..."
sudo -u "$SERVICE_USER" python3 -m venv "$INSTALL_DIR/.venv"
sudo -u "$SERVICE_USER" "$INSTALL_DIR/.venv/bin/pip" install -U pip wheel setuptools
sudo -u "$SERVICE_USER" "$INSTALL_DIR/.venv/bin/pip" install -e "$INSTALL_DIR"

if [ ! -f "$INSTALL_DIR/.env" ]; then
  SECRET=$(python3 -c 'import secrets; print(secrets.token_hex(48))')
  cat > "$INSTALL_DIR/.env" <<EOF
ONYXTHORN_SECRET_KEY=$SECRET
ONYXTHORN_BIND=127.0.0.1:8000
ONYXTHORN_PUBLIC_URL=https://$DOMAIN
DATABASE_URL=sqlite+aiosqlite:///$DATA_DIR/onyxthorn-sync.db
EOF
  chown "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
fi

echo "==> Writing systemd unit"
cat > /etc/systemd/system/onyxthorn-sync.service <<EOF
[Unit]
Description=OnyxThorn Sync Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now onyxthorn-sync

echo "==> Writing nginx vhost"
cat > /etc/nginx/sites-available/onyxthorn-sync <<EOF
server {
  listen 80;
  server_name $DOMAIN;

  client_max_body_size 100m;

  location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
ln -sf /etc/nginx/sites-available/onyxthorn-sync /etc/nginx/sites-enabled/onyxthorn-sync
nginx -t && systemctl reload nginx

echo "==> Requesting Let's Encrypt cert"
certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" --redirect

echo
echo "OK. Test with:"
echo "   curl https://$DOMAIN/healthz"
echo
echo "In OnyxThorn → Настройки → Синхронизация → Сменить сервер:"
echo "   https://$DOMAIN"
