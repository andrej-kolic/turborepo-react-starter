// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  // With the pnpm catalog as a source, syncpack fails any package that pins a
  // catalog dependency instead of using catalog: (DiffersToCatalog)
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
