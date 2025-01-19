import { Nullable } from "./type-utils";

export type HasId = { id: string };

export type IdOrHasId = HasId | string;

/** Get the first value in an array */
export const firstEntry = <T>(values: T[]): Nullable<T> => (values.length === 0 ? null : values[0]);

/** Get the last value in an array */
export const lastEntry = <T>(values: T[]): Nullable<T> => (values.length === 0 ? null : values[values.length - 1]);

/** Extract the id from an object (or string) */
export const extractId = (idOrValue1: IdOrHasId): string =>
  typeof idOrValue1 === "string" ? idOrValue1 : idOrValue1.id;

/** Extract the ids from a list of objects  */
export const extractIds = (values: HasId[]): string[] => values.map(extractId);

/** Get the unique ids from a list of objects with ids or ids */
export function getUniqueIds(values: IdOrHasId[], asSet: true): Set<string>;
export function getUniqueIds(values: IdOrHasId[], asSet?: false): string[];
export function getUniqueIds(values: IdOrHasId[], asSet: boolean = false): string[] | Set<string> {
  const result = new Set<string>();
  values.forEach((v) => result.add(extractId(v)));
  return asSet ? result : Array.from(result.values());
}

/** Checks whether the objects (or strings) share the same id */
export const equalsId =
  (idOrValue1: IdOrHasId) =>
  (idOrValue2: IdOrHasId): boolean =>
    extractId(idOrValue1) === extractId(idOrValue2);

/** Checks whether the objects (or strings) do not share the same id */
export const unEqualsId =
  (idOrValue1: IdOrHasId) =>
  (idOrValue2: IdOrHasId): boolean =>
    extractId(idOrValue1) !== extractId(idOrValue2);

/** Checks whether the list of objects (or strings) contains the given id */
export const containsId = (values: IdOrHasId[], idOrValue: IdOrHasId): boolean => values.some(equalsId(idOrValue));

/** Replaces an object by its id */
export const replaceById = <T extends HasId>(values: T[], replacementValue: T, addIfNotFound = false): T[] => {
  if (containsId(values, replacementValue)) {
    return values.map((v) => (v.id === replacementValue.id ? replacementValue : v));
  } else {
    if (addIfNotFound) return [...values, replacementValue];
    else return values;
  }
};

/** Retrieves an object by its id */
export const getById = <T extends HasId>(values: T[], valueOrId: IdOrHasId): T | null =>
  values.find(equalsId(valueOrId)) ?? null;

/** Remove an object by its id */
export const removeById = <T extends HasId>(values: T[], valueOrId: IdOrHasId): T[] =>
  values.filter(unEqualsId(valueOrId));
