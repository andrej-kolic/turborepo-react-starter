# Netlify deploy

Deploys the app's build to an existing Netlify site with the Netlify CLI. How to run a deploy: [docs/template/deploy.md](../../docs/template/deploy.md).

## Set up once

The deploy needs two values: the site's ID and a personal access token.

1. Create the token: [Netlify's docs](https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/#obtain-a-token-in-the-netlify-ui).
2. Find the site ID: it follows the site's name in this command, run from the repo root:

   ```sh
   pnpm --filter @repo/infra-netlify exec netlify sites:list --auth <token>
   ```

3. For deploys from your machine: copy [`.env.example`](.env.example) to `.env` in this folder and set `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN`. Git ignores `.env`.
4. For deploys from GitHub: add both as repository secrets.

   ```sh
   gh secret set NETLIFY_SITE_ID
   gh secret set NETLIFY_AUTH_TOKEN
   ```

## What a deploy does

[`tools/deploy-netlify.sh`](tools/deploy-netlify.sh) copies [`_headers`](_headers) and [`_redirects`](_redirects) into the app's `dist/`, then runs `dev-tools-sentry-sourcemaps`: it uploads the source maps to your Sentry project and deletes them from `dist/` ([error-reporting.md](../../docs/template/error-reporting.md#readable-stack-traces)). Then it deploys. Only `BUILD_ENVIRONMENT=production` updates the live site; any other stage makes a draft deploy at its own address. The result is written to `deploy_output.json`, which git ignores.
