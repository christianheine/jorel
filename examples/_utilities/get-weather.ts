export const getWeather = async ({ city }: { city: string }) => {
  return {
    city,
    temperature: 25,
    condition: "Sunny",
  };
};
