#!/bin/sh
set -eu

keyfile=/data/db/.replica-key
if [ ! -s "$keyfile" ]; then
  umask 077
  head -c 48 /dev/urandom | base64 > "$keyfile"
fi
chown mongodb:mongodb "$keyfile"
chmod 400 "$keyfile"

exec docker-entrypoint.sh mongod --replSet rs0 --keyFile "$keyfile" "$@"
