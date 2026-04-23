#!/bin/sh
set -e

# Substitute environment variables in Prometheus config
envsubst < /etc/prometheus/prometheus.yml.tmpl > /etc/prometheus/prometheus.yml

exec /bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=15d \
  --web.enable-lifecycle \
  "$@"
