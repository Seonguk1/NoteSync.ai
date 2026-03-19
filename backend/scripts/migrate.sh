#!/bin/bash
# Alembic 마이그레이션 적용/롤백 자동화 스크립트
set -e
cd "$(dirname "$0")"

# DB URL 환경변수 필요 (예: export DB_URL=...)
export ALEMBIC_CONFIG=../alembic.ini

case "$1" in
  upgrade)
    alembic -c $ALEMBIC_CONFIG upgrade head
    ;;
  downgrade)
    alembic -c $ALEMBIC_CONFIG downgrade -1
    ;;
  history)
    alembic -c $ALEMBIC_CONFIG history
    ;;
  *)
    echo "사용법: $0 {upgrade|downgrade|history}"
    exit 1
    ;;
esac
