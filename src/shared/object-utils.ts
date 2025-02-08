export const omit = <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const copy = { ...obj };
  keys.forEach((key) => {
    delete copy[key];
  });
  return copy;
};

export const maskAll = <T extends Record<string, any>>(obj: T): Record<keyof T, string> => {
  const copy = { ...obj };
  for (const key in copy) {
    copy[key] = "********" as T[Extract<keyof T, string>];
  }
  return copy;
};

export function shallowFilterUndefined<T = any>(arg: T): T {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return Object.keys(arg).reduce((acc, key) => {
    const _acc = acc;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (arg[key] !== undefined) _acc[key] = arg[key];
    return _acc;
  }, {});
}
