#!/bin/sh
set -e

IMAGE_NAME="secureauth-api:dev"
CONTAINER_NAME="secureauth-api-dev"

echo "==> Building dev image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "==> Starting dev container on http://localhost:3000 (Ctrl+C to stop)"
docker run --rm -it \
  --name "$CONTAINER_NAME" \
  --sysctl net.ipv6.conf.all.disable_ipv6=1 \
  --sysctl net.ipv6.conf.default.disable_ipv6=1 \
  -p 3000:3000 \
  -v "$(pwd)":/app \
  -v /app/node_modules \
  "$IMAGE_NAME" \
  npm run dev