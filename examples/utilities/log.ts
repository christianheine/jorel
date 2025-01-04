// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const log = (message: string, data: any) => {
  console.log(message + ":", JSON.stringify(data, null, 2));
};
