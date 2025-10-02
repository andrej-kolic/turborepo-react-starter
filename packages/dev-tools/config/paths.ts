import path from 'node:path';

const __dirname = process.cwd();

const pathResolve = (pathEntry: string) => path.resolve(__dirname, pathEntry);

const appCorePublic = pathResolve('./node_modules/@repo/app-core/public');
const distPath = pathResolve('./dist');
const appCoreEnvDir = pathResolve('./node_modules/@repo/app-core/');

export { appCorePublic, appCoreEnvDir, distPath };
