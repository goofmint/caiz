#!/usr/bin/env sh
set -eu
: "${HOST:?HOST is required}"
: "${DOC_HOST:?DOC_HOST is required}"

# テンプレートを実体化
cp /etc/nginx/nginx.conf.template /etc/nginx/nginx.conf

# ${HOST}, ${DOC_HOST} を sed で置換
sed -i \
  -e "s|\${HOST}|$HOST|g" \
  -e "s|\${DOC_HOST}|$DOC_HOST|g" \
  /etc/nginx/nginx.conf
