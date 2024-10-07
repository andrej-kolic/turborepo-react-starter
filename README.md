# Turborepo React starter

Monorepo starter project for FE projects

## What's inside?

### Apps and Packages

- ...
- `app-core`: React app developed as library ('light package')
- `@repo/ui`: a stub React component library shared by applications
- `@repo/ui`: a stub library shared by other packages
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

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

### Debug

https://code.visualstudio.com/docs/nodejs/reactjs-tutorial#_debugging-react

To open chrome in debug mode run:
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=remote-debug-profile
```
(lot's of data will be saved to 'remote-debug-profile' dir)
