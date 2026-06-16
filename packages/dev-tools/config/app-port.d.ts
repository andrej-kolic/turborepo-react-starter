export interface AppEndpoints {
  devPort: number;
  previewPort: number;
  devUrl: string;
  previewUrl: string;
}

export interface AppTargetsFromEnv {
  url: string;
  port: string;
  source: 'APP_URL' | 'BUNDLER';
}

export type AppTargets = AppTargetsFromEnv & Partial<AppEndpoints>;

export function loadAppEndpoints(
  appDirName: string,
  workspaceRoot?: string,
): AppEndpoints;

export function resolveAppTargets(env?: NodeJS.ProcessEnv): AppTargets | null;

export function resolveAppUrl(env?: NodeJS.ProcessEnv): string | null;
