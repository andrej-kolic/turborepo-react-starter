// @ts-check

/** @type {import("syncpack").RcFile} */
const config = {
  lintFormatting: false,

  dependencyTypes: ['prod', 'dev'],

  semverGroups: [
    {
      dependencies: ['**'],
      packages: ['**'],
      range: '',
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

  // versionGroups: [
  //   {
  //     label: "@types packages should only be under devDependencies",
  //     dependencies: ["@types/**"],
  //     dependencyTypes: ["!dev"],
  //     isBanned: true,
  //   },
  //   {
  //     label: "Use workspace protocol when developing local packages",
  //     dependencies: ["$LOCAL"],
  //     dependencyTypes: ["dev"],
  //     pinVersion: "workspace:*",
  //   },
  // ],
};

module.exports = config;
