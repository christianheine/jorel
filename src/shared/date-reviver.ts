const dateRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)(Z|([+-])(\d{2}):(\d{2}))$/;

/** JSON date reviver (revive dates when parsing JSON objects) */
export function dateReviver<T>(key: string, value: T) {
  if (typeof value === "string" && value.match(dateRegex)) {
    return new Date(value);
  } else {
    return value;
  }
}
