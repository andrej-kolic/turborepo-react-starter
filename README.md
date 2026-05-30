# Turborepo React starter

Monorepo starter project for FE projects

## What's inside?

### Source

Most packages are 'light', meaning they only export source code without build/bundle step.
Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

#### Apps

- `app-esbild`: ESBuild bundler for main app
- `app-vite`: Vite bundler for main app
- `app-webpack`: Webpack bundler for main app
- `ui-storybook`: Storybook as dev server for ui package

#### Packages

- `app-core`: React app developed as library
- `commons`: a stub library shared by other packages. built using tsup
- `dev-tools`: utils for development, shared by other packages. not meant to be used in source code
- `@repo/ui`: a stub React component library shared by applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

#### Infra

- `aws`: CloudFormation-based AWS deployment with CloudFront, S3, and ACM certificates
- `netlify`: tools and scripts used to deploy to Netlify, both locally and from CI

### Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
pnpm dev
```

### Test

To test all apps and packages, run the following command:

```
pnpm test
```

### Lint

To lint all apps and packages, run the following command:

```
pnpm lint
```

### Debug

To open Chrome in debug mode with automatic lifecycle management:

```bash
pnpm chrome:debug
```

This automatically:

- Detects Chrome on your machine
- Starts it with remote debugging enabled
- Manages the session (start/stop/status)

See [copilot-instructions.md](.github/copilot-instructions.md#chrome-remote-debugging-for-agents--browser-inspection) for full details and agent integration examples.
