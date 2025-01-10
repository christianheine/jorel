import {v4} from "uuid";

export const generateUniqueId = (): string => {
  return v4();
};
