import { v7 } from "uuid";

export const generateUniqueId = (): string => {
  return v7();
};
