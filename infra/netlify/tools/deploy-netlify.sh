#!/bin/bash

prod_flag=""
if [ ${BUILDENV} = "production" ]; then prod_flag="--prod"; fi

pnpm netlify deploy \
--dir apps/${BUNDLER}/dist \
--site ${NETLIFY_SITE_ID} \
--auth ${NETLIFY_AUTH_TOKEN} \
--filter ${BUNDLER} \
$prod_flag \
--json
