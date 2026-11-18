FROM nginx:1.27-alpine

COPY default.conf /etc/nginx/conf.d/default.conf
# Trang chờ tạm thời; khi có frontend sẽ thay bằng bản build Vite.
COPY html/ /usr/share/nginx/html/
