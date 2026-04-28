#!/bin/bash
# Process biome unsafe fixes per-file with a timeout to skip hanging files
BIOME="frontend/node_modules/.bin/biome"
TIMEOUT=10  # seconds

while IFS= read -r f; do
  # Use background + wait to implement timeout
  $BIOME check --write --unsafe "$f" > /dev/null 2>&1 &
  PID=$!

  # Wait with timeout
  SECONDS=0
  while kill -0 $PID 2>/dev/null; do
    if [ $SECONDS -ge $TIMEOUT ]; then
      kill $PID 2>/dev/null
      wait $PID 2>/dev/null
      echo "TIMEOUT: $f"
      break
    fi
    sleep 0.2
  done

  wait $PID 2>/dev/null
  EXIT=$?
  if [ $EXIT -eq 0 ] && [ $SECONDS -lt $TIMEOUT ]; then
    echo "FIXED: $f"
  fi
done < /tmp/biome-block-files.txt

echo "DONE"
