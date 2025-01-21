const getPreviousDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

export const getStockValue = async (params: { tickerSymbol: string }) => {
  const date = getPreviousDate();
  const open = Math.random() * 1000;
  return {
    date,
    tickerSymbol: params.tickerSymbol,
    open,
    close: open + Math.random() * 10,
    volume: 1000000,
  };
  // You'll need to create a Polygon API key to get stock data
  // See https://polygon.io/docs/stocks/get_v1_open-close__stocksticker___date
  // const apiKey = process.env.POLYGON_API_KEY;
  // const response = await fetch(
  //   `https://api.polygon.io/v1/open-close/${params.tickerSymbol.toUpperCase()}/${date}?adjusted=true&apiKey=${apiKey}`,
  // );
  // if (!response.ok) {
  //   throw new Error(`Failed to fetch stock data: ${response.statusText}, ${await response.text()}`);
  // }
  // const data = await response.json();
  // return {
  //   from: data.from,
  //   symbol: data.symbol,
  //   open: data.open,
  //   close: data.close,
  //   volume: data.volume,
  // };
};
