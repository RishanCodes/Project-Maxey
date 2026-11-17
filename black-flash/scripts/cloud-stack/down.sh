#!/usr/bin/env bash
docker rm -f bf-db bf-auth bf-rest bf-mail >/dev/null 2>&1 || true
docker network rm bfnet >/dev/null 2>&1 || true
echo "stack removed"
