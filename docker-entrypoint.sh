#!/bin/sh
set -e

echo "👻 [GhostTRACE] Initializing database schema on mounted storage..."
npx prisma db push --skip-generate || true

echo "🚀 [GhostTRACE] Launching enterprise observability engine..."
exec "$@"
