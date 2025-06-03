#!/bin/sh

# Find the running backend container name (first match)
CONTAINER=$(docker ps --filter 'name=backend' --format '{{.Names}}' | head -n 1)

if [ -z "$CONTAINER" ]; then
  echo "No running backend container found."
  exit 1
fi

echo "Running tests in container: $CONTAINER"
docker exec -it "$CONTAINER" npm test src/tests/upload_youtube.e2e.test.ts
EXIT_CODE=$?

exit $EXIT_CODE 