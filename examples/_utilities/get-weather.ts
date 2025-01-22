export const getWeather = async ({ city }: { city: string }) => {
  return {
    city,
    temperature: 25,
    condition: "Sunny",
  };
  // Request weather data from the Weather API
  // Requires a Weather API key
  // const apiKey = process.env.WEATHER_API_KEY;
  // const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}&aqi=no`);
  // const data = await response.json();
  // return {
  //   city: data.location.name,
  //   temperature: data.current.temp_c,
  //   condition: data.current.condition.text,
  // };
};
