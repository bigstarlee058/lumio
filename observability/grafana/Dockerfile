FROM grafana/grafana-oss:10.4.3

COPY observability/grafana/provisioning /etc/grafana/provisioning
COPY observability/grafana/dashboards /var/lib/grafana/dashboards

ENV GF_USERS_ALLOW_SIGN_UP=false
ENV GF_AUTH_ANONYMOUS_ENABLED=false
ENV GF_SECURITY_COOKIE_SECURE=true

USER 472
