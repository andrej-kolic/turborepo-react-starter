import { fileURLToPath } from 'node:url';

export const performanceObserverInject = fileURLToPath(
  new URL('./performance-observer.inject.js', import.meta.url),
);

export const interactionRecorderInject = fileURLToPath(
  new URL('./interaction-recorder.inject.js', import.meta.url),
);
