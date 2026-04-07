FROM nginx:1.27-alpine
RUN apk add --no-cache openssl
RUN addgroup -S aloe && adduser -S aloe -G aloe
COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY privacy.html /usr/share/nginx/html/
COPY aloe_plant_green.png /usr/share/nginx/html/
COPY docker-entrypoint-local.sh /usr/local/bin/docker-entrypoint-local.sh
RUN chown -R aloe:aloe /usr/share/nginx/html \
    && chown -R aloe:aloe /var/cache/nginx \
    && chown -R aloe:aloe /var/log/nginx \
    && mkdir -p /etc/nginx/tls \
    && chown -R aloe:aloe /etc/nginx/tls \
    && touch /var/run/nginx.pid \
    && chown aloe:aloe /var/run/nginx.pid \
    && chmod +x /usr/local/bin/docker-entrypoint-local.sh
USER aloe
EXPOSE 8080 8443
CMD ["/usr/local/bin/docker-entrypoint-local.sh"]
