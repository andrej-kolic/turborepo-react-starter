// eslint-disable-next-line @typescript-eslint/no-empty-function
export const empty = () => {};

export const emptyAsync = async () => {
  await Promise.resolve();
};

export const identity = (x: unknown) => x;

export const identityAsync = async (x: unknown) => {
  await Promise.resolve(x);
};
