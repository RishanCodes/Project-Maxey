#!/usr/bin/env bash
# Starts a local Supabase-compatible stack (Postgres, Auth, PostgREST, mail catcher) for end-to-end tests.
# Requires Docker. Writes connection details to .env.cloud-test in the project root.
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
eval "$(node keys.mjs)"
PW=localtestpassword
docker network create bfnet >/dev/null 2>&1 || true
docker rm -f bf-db bf-auth bf-rest bf-mail >/dev/null 2>&1 || true
docker run -d --name bf-db --network bfnet -p 54322:5432 -e POSTGRES_PASSWORD=$PW -e JWT_SECRET=$JWT_SECRET supabase/postgres:15.8.1.085 >/dev/null
docker run -d --name bf-mail --network bfnet -p 8025:8025 axllent/mailpit:v1.21 >/dev/null
for i in $(seq 1 60); do docker exec bf-db pg_isready -U postgres -h localhost >/dev/null 2>&1 && break; sleep 2; done
sleep 5
docker exec -i -e PGPASSWORD=$PW bf-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 >/dev/null <<SQL
alter role authenticator with login password '$PW';
alter role supabase_auth_admin with login password '$PW';
SQL
docker run -d --name bf-auth --network bfnet -p 9999:9999 \
  -e GOTRUE_API_HOST=0.0.0.0 -e GOTRUE_API_PORT=9999 -e API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1 \
  -e GOTRUE_DB_DRIVER=postgres -e "GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:$PW@bf-db:5432/postgres" \
  -e GOTRUE_SITE_URL=http://localhost:3000 -e GOTRUE_DISABLE_SIGNUP=true -e GOTRUE_JWT_SECRET=$JWT_SECRET \
  -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=false -e GOTRUE_SMTP_HOST=bf-mail -e GOTRUE_SMTP_PORT=1025 \
  -e GOTRUE_SMTP_ADMIN_EMAIL=auth@example.com -e GOTRUE_SMTP_SENDER_NAME="BLACK FLASH" -e GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 \
  -e GOTRUE_SMTP_MAX_FREQUENCY=1s \
  supabase/gotrue:v2.180.0 >/dev/null
for i in $(seq 1 60); do curl -sf http://127.0.0.1:9999/health >/dev/null && break; sleep 2; done
docker exec -i -e PGPASSWORD=$PW bf-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 >/dev/null < "$ROOT/supabase/migrations/20261117000000_black_flash.sql"
docker run -d --name bf-rest --network bfnet -p 3001:3000 \
  -e "PGRST_DB_URI=postgres://authenticator:$PW@bf-db:5432/postgres" -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET=$JWT_SECRET -e PGRST_DB_USE_LEGACY_GUCS=false postgrest/postgrest:v12.2.3 >/dev/null
for i in $(seq 1 30); do curl -sf http://127.0.0.1:3001/ -H "apikey: $ANON_KEY" >/dev/null && break; sleep 1; done
cat > "$ROOT/.env.cloud-test" <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
DB_PASSWORD=$PW
ENV
echo "stack up"
