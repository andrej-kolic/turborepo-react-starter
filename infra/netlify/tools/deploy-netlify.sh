#!/bin/bash

prod_flag=""
if [ ${PRODUCTION} = "true" ]; then prod_flag="--prod"; fi

pnpm netlify deploy \
--dir apps/${BUNDLER}/dist \
--site ${NETLIFY_SITE_ID} \
--auth ${NETLIFY_AUTH_TOKEN} \
$prod_flag \
--filter ${BUNDLER}
