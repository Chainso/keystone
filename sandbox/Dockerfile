FROM docker.io/cloudflare/sandbox:0.8.10

COPY bootstrap.sh /usr/local/bin/keystone-sandbox-bootstrap

RUN chmod +x /usr/local/bin/keystone-sandbox-bootstrap \
  && /usr/local/bin/keystone-sandbox-bootstrap
