export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> =>
  (Object.keys(obj) as K[]).reduce((acc, key) => {
    if (!keys.includes(key)) (acc as any)[key] = obj[key];
    return acc;
  }, {} as Omit<T, K>);

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
