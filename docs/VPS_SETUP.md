# Развёртывание OnyxThorn Sync на твоём VPS

Эта инструкция поднимает sync-сервер (FastAPI + sqlite/postgres + nginx + Let's Encrypt) под доменом, который ты заранее прописал на этот сервер.

## Требования

* **VPS**: Debian 11/12 или Ubuntu 22.04/24.04. Минимум 1 vCPU / 1 GB RAM / 10 GB диска.
* **Домен/субдомен** (например `sync.example.com`), указывающий A-записью на IP VPS.
* **Открытые порты**: 80 и 443 (HTTP/HTTPS) на всю мировую сеть.
* **Email** для Let's Encrypt.

---

## 1. Подключиться по SSH

```sh
ssh root@<ip-vps>
```

(Если работаешь не из-под root — все команды ниже добавляй с `sudo`.)

## 2. Получить код

```sh
apt-get update && apt-get install -y git
git clone https://github.com/<твой-юзер>/onyxthorn-browser.git /opt/onyxthorn
```

## 3. Запустить установщик

```sh
cd /opt/onyxthorn/server/deploy
./install.sh sync.example.com you@example.com
```

Где:
* `sync.example.com` — твой домен (с прописанной A-записью);
* `you@example.com` — email для Let's Encrypt уведомлений.

Установщик сделает:

1. поставит `python3.11`, `nginx`, `certbot`, build-tools;
2. создаст системного пользователя `onyxthorn` (без shell);
3. создаст виртуальное окружение `/opt/onyxthorn-sync/.venv` и установит туда пакеты;
4. сгенерирует случайный `ONYXTHORN_SECRET_KEY` и положит в `/opt/onyxthorn-sync/.env`;
5. напишет `systemd`-unit `onyxthorn-sync.service` и сразу включит его;
6. напишет конфиг nginx для проксирования `/` → `127.0.0.1:8000`;
7. запросит у Let's Encrypt сертификат и настроит redirect HTTP → HTTPS.

## 4. Проверить

```sh
curl https://sync.example.com/healthz
# → {"ok":true,"version":"0.1.0"}

curl https://sync.example.com/version
# → {"name":"OnyxThorn Sync","version":"0.1.0","protocol":1}
```

Swagger UI: <https://sync.example.com/docs>

## 5. Прописать сервер в браузере

После того как поставишь OnyxThorn на свою Windows-машину:

1. Открой `about:preferences#sync` (или меню → Настройки → Синхронизация).
2. Нажми **«Сменить сервер»** (под полем «Сервер»).
3. Вставь `https://sync.example.com` → ОК.
4. Нажми **«Создать аккаунт»** или **«Войти»**.
5. Выбери, что синхронизировать, и жми **«Синхронизировать сейчас»**.

> Помни: синхронизация запускается **только** руками — фонового sync нет.

## 6. Управление

```sh
systemctl status  onyxthorn-sync
systemctl restart onyxthorn-sync
journalctl -u     onyxthorn-sync -f
```

Конфиг: `/opt/onyxthorn-sync/.env` (после редактирования → `systemctl restart onyxthorn-sync`).

База: `/var/lib/onyxthorn-sync/onyxthorn-sync.db` (SQLite).

Логи nginx: `/var/log/nginx/access.log` и `error.log`.

## 7. Переход на Postgres (по желанию)

```sh
apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql <<EOF
CREATE USER onyxthorn WITH PASSWORD 'СВОЙ_СЛОЖНЫЙ_ПАРОЛЬ';
CREATE DATABASE onyxthorn OWNER onyxthorn;
EOF

# В /opt/onyxthorn-sync/.env замени строку:
DATABASE_URL=postgresql+asyncpg://onyxthorn:СВОЙ_СЛОЖНЫЙ_ПАРОЛЬ@localhost/onyxthorn

systemctl restart onyxthorn-sync
```

## 8. Резервное копирование сервера

```sh
# SQLite
cp /var/lib/onyxthorn-sync/onyxthorn-sync.db /backup/onyxthorn-$(date +%F).db

# Postgres
sudo -u postgres pg_dump -Fc onyxthorn > /backup/onyxthorn-$(date +%F).pgdump
```

Положи это в `cron` чтобы делалось каждую ночь.

## 9. Обновление сервера

```sh
cd /opt/onyxthorn
git pull
sudo -u onyxthorn /opt/onyxthorn-sync/.venv/bin/pip install -e /opt/onyxthorn-sync
systemctl restart onyxthorn-sync
```

## 10. Что хранится на сервере

* `users` — email, ник, аватар URL, **argon2id-хеш пароля**, KDF-соль.
* `tokens` — JWT-метаданные (jti, expires, revoked).
* `collections` — для каждой пары (user, collection) последний **зашифрованный** payload (IV + ciphertext). Сервер **не знает** ключа.
* `backups` — последние 30 снапшотов профиля, тоже **зашифрованные**.

См. подробности в [`SYNC_PROTOCOL.md`](SYNC_PROTOCOL.md).

## 11. Безопасность / закалка

* SSH: настрой ключи, отключи парольный вход и root-логин.
* `ufw enable && ufw allow OpenSSH && ufw allow 'Nginx Full'`.
* Включи unattended-upgrades: `apt-get install -y unattended-upgrades && dpkg-reconfigure unattended-upgrades`.
* В `nginx` ограничь body size — у нас уже 100m, можно меньше если не делаешь больших бекапов.
* Регулярно обновляй сервер.

## 12. Удаление

```sh
systemctl stop onyxthorn-sync
systemctl disable onyxthorn-sync
rm /etc/systemd/system/onyxthorn-sync.service
rm /etc/nginx/sites-enabled/onyxthorn-sync /etc/nginx/sites-available/onyxthorn-sync
rm -rf /opt/onyxthorn-sync /var/lib/onyxthorn-sync
userdel onyxthorn
systemctl daemon-reload && nginx -t && systemctl reload nginx
```
