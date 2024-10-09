#!/bin/bash

# TODO: add netlify-cli to dev dependencies in proper package
pnpm \
--package=netlify-cli dlx netlify deploy \
--dir apps/app-vite/dist \
--site ${NETLIFY_SITE_ID} \
--auth ${NETLIFY_AUTH_TOKEN} \
--filter app-vite
