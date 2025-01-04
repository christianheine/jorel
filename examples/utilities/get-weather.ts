// Simulate a tool that fetches the weather for a city
export const getWeather = async ({city}: { city: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const temperature = Math.floor(Math.random() * 20 + 10);
  const conditionOptions = ["sunny", "cloudy", "rainy", "overcast"];
  const conditions = conditionOptions[Math.floor(Math.random() * conditionOptions.length)];

  if (city.toLowerCase() === "sydney" || city.toLowerCase() === "melbourne" || city.toLowerCase() === "paris") {
    return {city, temperature, conditions};
  }

  throw new Error("City not found");
};