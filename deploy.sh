#!/usr/bin/env bash
set -Eeuo pipefail

readonly repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly compose_file="$repo_dir/compose.production.yaml"
readonly lock_file="/tmp/researchos-deploy.lock"

exec 9>"$lock_file"
flock -n 9 || {
  echo "A ResearchOS deployment is already running."
  exit 0
}

cd "$repo_dir"

echo "Updating ResearchOS from Gitea origin/master..."
git pull --ff-only origin master

echo "Building only the ResearchOS API and migration images..."
docker compose -f "$compose_file" build api migrate

echo "Applying ResearchOS database migrations..."
docker compose -f "$compose_file" run --rm migrate

echo "Recreating only the ResearchOS API..."
docker compose -f "$compose_file" up -d --no-deps --force-recreate api

echo "Waiting for the local ResearchOS API health check..."
for attempt in {1..30}; do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3002/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! curl --fail --silent --max-time 5 http://127.0.0.1:3002/api/health >/dev/null 2>&1; then
  echo "ResearchOS API did not become healthy after deployment."
  docker compose -f "$compose_file" ps api
  docker compose -f "$compose_file" logs --tail=120 api
  exit 1
fi

echo "Refreshing only the ResearchOS Cloudflare Tunnel origin..."
docker compose -f "$compose_file" restart cloudflared

echo "Waiting for the public ResearchOS API health check..."
for attempt in {1..30}; do
  if curl --fail --silent --max-time 5 https://api.research-os.org/api/health >/dev/null 2>&1; then
    echo "ResearchOS API deployment complete."
    exit 0
  fi
  sleep 2
done

echo "ResearchOS public API did not become healthy after deployment."
docker compose -f "$compose_file" ps api cloudflared
docker compose -f "$compose_file" logs --tail=120 api cloudflared
exit 1
