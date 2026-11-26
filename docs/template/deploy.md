# Deploy the app

The app deploys to AWS (S3 behind CloudFront) or Netlify, from your machine or from GitHub. Agents can run every route below; each needs credentials an agent can't create, so a person sets them up once.

| Route           | Command                                                | Needs                              |
| --------------- | ------------------------------------------------------ | ---------------------------------- |
| AWS, local      | `BUILD_ENVIRONMENT=development pnpm deploy:aws`        | AWS credentials (`aws configure`)  |
| Netlify, local  | `pnpm deploy:netlify`                                  | `infra/netlify/.env`               |
| AWS, GitHub     | `gh workflow run deploy-aws-content.yaml --ref main …` | `gh` signed in; the repo's secrets |
| Netlify, GitHub | `gh workflow run deploy-netlify.yaml --ref main …`     | `gh` signed in; the repo's secrets |

Every route builds the app first. A build with a Sentry DSN reports errors, and every route uploads its source maps to Sentry when it finds the credentials: [error-reporting.md](error-reporting.md).

## From your machine

The bundler and the stage come from `BUNDLER` and `BUILD_ENVIRONMENT` in the root `.env`; set one on the command line to change it for one deploy. The build also loads your `.local` env files: [env.md](env.md#which-env-files-load).

### AWS

1. Check the credentials: `aws sts get-caller-identity` prints your account.
2. Deploy: `BUILD_ENVIRONMENT=development pnpm deploy:aws`. The stage is `development`, `staging` or `production`.
3. Check the site: `./infra/aws/scripts/deploy.sh outputs development` prints its address as `Website URL`.

This updates the site's files only. The site itself (bucket, CloudFront, certificate) must exist first: [infra/aws/README.md](../../infra/aws/README.md#deploy-the-solution).

### Netlify

1. Deploy: `pnpm deploy:netlify`.
2. Open `deploy_url` in the JSON the command prints.

Only `production` updates the live site. Any other stage makes a draft deploy, at its own address. The site ID and token are set up once: [infra/netlify/README.md](../../infra/netlify/README.md#set-up-once).

## From GitHub

Start a deploy workflow on `main`; it takes the bundler (`default` is the repo variable `DEFAULT_BUNDLER`) and the stage:

```sh
gh workflow run deploy-aws-content.yaml --ref main -f bundler=default -f environment=development
gh workflow run deploy-netlify.yaml --ref main -f bundler=default -f environment=staging
```

`gh run watch <run id> --exit-status` waits for it and fails if the deploy fails; `gh run list --workflow <file> --limit 1` gives the run id. Every push to `main` also deploys to AWS `staging`.

The workflows read their credentials from the repo's secrets and variables; your machine needs none. AWS signs in with GitHub's OIDC role, set up once: [infra/aws/README.md](../../infra/aws/README.md#method-1-github-actions-with-oidc-recommended). Netlify's secrets: [infra/netlify/README.md](../../infra/netlify/README.md#set-up-once).
