#!/bin/sh
set -eu

CERT_DIR=/etc/nginx/tls
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 365 \
    -subj "/CN=localhost"
fi

exec nginx -g 'daemon off;'