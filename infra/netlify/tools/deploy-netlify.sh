#!/bin/bash

echo "Deploying to Netlify..."

# echo " "
# echo "BUNDLER: $BUNDLER"
# echo "BUILD_ENVIRONMENT: $BUILD_ENVIRONMENT"
# echo "NETLIFY_SITE_ID: $NETLIFY_SITE_ID"
# echo " "

set -e

# Check if required environment variables are set
if [ -z "$BUNDLER" ] || [ -z "$BUILD_ENVIRONMENT" ] || [ -z "$NETLIFY_SITE_ID" ] || [ -z "$NETLIFY_AUTH_TOKEN" ]; then
  echo "One or more required environment variables are missing. Exiting."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONOREPO_ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cp "${SCRIPT_DIR}/../_headers" "${MONOREPO_ROOT_DIR}/apps/${BUNDLER}/dist/_headers"
cp "${SCRIPT_DIR}/../_redirects" "${MONOREPO_ROOT_DIR}/apps/${BUNDLER}/dist/_redirects"

# Before the deploy, so no .map file is ever published: see docs/template/error-reporting.md.
pnpm --dir "${MONOREPO_ROOT_DIR}" exec dev-tools-sentry-sourcemaps "${MONOREPO_ROOT_DIR}/apps/${BUNDLER}/dist"

# Determine if we are deploying to production
prod_flag=""
if [ "${BUILD_ENVIRONMENT}" = "production" ]; then prod_flag="--prod"; fi

# Deploy to Netlify
pnpm netlify deploy \
--dir apps/"${BUNDLER}"/dist \
--site "${NETLIFY_SITE_ID}" \
--auth "${NETLIFY_AUTH_TOKEN}" \
--filter "${BUNDLER}" \
$prod_flag \
--json \
> deploy_output.json
