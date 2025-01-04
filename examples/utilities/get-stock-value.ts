const getPreviousDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};

// You'll need to create a Polygon API key to get stock data
// See https://polygon.io/docs/stocks/get_v1_open-close__stocksticker___date
export const getStockValue = async (params: { tickerSymbol: string }) => {
  const apiKey = process.env.POLYGON_API_KEY;
  const date = getPreviousDate();
  console.log(`[getStockValue] Fetching stock data for ${params.tickerSymbol} on ${date}`);
  const response = await fetch(`https://api.polygon.io/v1/open-close/${params.tickerSymbol.toUpperCase()}/${date}?adjusted=true&apiKey=${apiKey}`);
  const data = await response.json();
  return {
    from: data.from,
    symbol: data.symbol,
    open: data.open,
    close: data.close,
    volume: data.volume,
  };
};
