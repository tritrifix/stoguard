#!/bin/sh
# "set -e" est essentiel ici : si "prisma migrate deploy" échoue, le script
# s'arrête avant le "exec" et le conteneur ne démarre jamais l'app sur une
# base au mauvais schéma.
set -e

echo "Applying database migrations..."
node_modules/.bin/prisma migrate deploy

exec "$@"