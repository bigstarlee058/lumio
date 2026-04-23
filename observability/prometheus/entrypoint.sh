#!/bin/sh
set -e

# Substitute environment variables in Prometheus config
# Using shell-based substitution since envsubst is not available
sed -e "s|\${BACKEND_METRICS_TARGET}|${BACKEND_METRICS_TARGET}|g" \
    -e "s|\${METRICS_AUTH_TOKEN}|${METRICS_AUTH_TOKEN}|g" \
    /etc/prometheus/prometheus.yml.tmpl > /etc/prometheus/prometheus.yml

# Ensure storage directory is writable
chmod -R 777 /prometheus 2>/dev/null || true

exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=15d \
  --web.enable-lifecycle \
  "$@"
