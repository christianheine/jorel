import { Nullable } from "./type-utils";

/** Get the first value in an array */
export const firstEntry = <T>(values: T[]): Nullable<T> => (values.length === 0 ? null : values[0]);

/** Get the last value in an array */
export const lastEntry = <T>(values: T[]): Nullable<T> => (values.length === 0 ? null : values[values.length - 1]);
