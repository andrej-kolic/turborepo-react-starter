#!/bin/bash

pnpm netlify deploy \
--dir apps/app-vite/dist \
--site ${NETLIFY_SITE_ID} \
--auth ${NETLIFY_AUTH_TOKEN} \
--filter app-vite
