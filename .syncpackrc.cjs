// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  // Include pnpm catalog definitions so syncpack can resolve catalog: specifiers
  source: [
    'package.json',
    'pnpm-workspace.yaml',
    'apps/*/package.json',
    'packages/*/package.json',
    'infra/*/package.json',
  ],

  semverGroups: [
    {
      dependencies: ['**'],
      packages: ['**'],
      range: '',
    },
  ],

  versionGroups: [
    {
      label: 'Local packages must use workspace protocol',
      dependencies: ['$LOCAL'],
      dependencyTypes: ['dev', 'prod'],
      pinVersion: 'workspace:*',
    },
    //   {
    //     label: "@types packages should only be under devDependencies",
    //     dependencies: ["@types/**"],
    //     dependencyTypes: ["!dev"],
    //     isBanned: true,
    //   },
    {
      label: 'Catalogued deps must reference catalog, not pin directly',
      dependencyTypes: ['dev', 'prod'],
      dependencies: [
        'react',
        'react-dom',
        '@types/react',
        '@types/react-dom',
        '@types/node',
        'vite',
        'ts-node',
        'serve',
        '@turbo/gen',
        'vitest',
        'jsdom',
        '@testing-library/dom',
        '@testing-library/jest-dom',
        '@testing-library/react',
        '@testing-library/user-event',
      ],
      pinVersion: 'catalog:',
    },
  ],

  // semverGroups: [
  //   {
  //     label: "use exact version numbers in production",
  //     range: "",
  //     dependencyTypes: [
  //       "prod",
  //       "resolutions",
  //       "overrides",
  //       "pnpmOverrides",
  //       "peer",
  //     ],
  //     dependencies: ["**"],
  //     packages: ["**"],
  //   },
  //   {
  //     label: "use ^ version range for dev dependencies",
  //     range: "^",
  //     dependencyTypes: ["dev"],
  //     dependencies: ["**"],
  //     packages: ["**"],
  //   },
  // ],
};

module.exports = config;
