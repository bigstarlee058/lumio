FROM prom/prometheus:v2.50.1

USER root

COPY observability/prometheus.railway.yml /etc/prometheus/prometheus.yml
COPY observability/prometheus/rules /etc/prometheus/rules

RUN chown -R nobody:nobody /etc/prometheus /prometheus

USER nobody

ENTRYPOINT ["/bin/prometheus"]
CMD ["--config.file=/etc/prometheus/prometheus.yml", \
     "--config.expand-env", \
     "--storage.tsdb.path=/prometheus", \
     "--storage.tsdb.retention.time=15d", \
     "--web.enable-lifecycle"]
