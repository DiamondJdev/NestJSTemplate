#!/bin/sh
set -e

# Runs once, on first boot against an empty Postgres data directory.
# POSTGRES_DB (template_dev) is already created by the base image's entrypoint
# before this runs; this only adds the sibling test database so the E2E suite
# (test/jest-e2e.json) has an isolated DB without a second container.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE template_test;
EOSQL
