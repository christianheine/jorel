export const getStockValue = async (params: { tickerSymbol: string }) => {
  // You'll need to create a Polygon API key to get stock data
  // See https://polygon.io/docs/stocks/get_v2_aggs_ticker__stocksticker__prev
  const apiKey = process.env.POLYGON_API_KEY;
  // Fetch the previous day's stock data for the given ticker symbol
  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/${params.tickerSymbol.toUpperCase()}/prev?adjusted=true&apiKey=${apiKey}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch stock data: ${response.statusText}, ${await response.text()}`);
  }
  const data = await response.json();
  if (data.resultsCount === 0) {
    throw new Error(`No data found for ${params.tickerSymbol}`);
  }
  // Example response:
  // {
  //   "ticker": "AAPL",
  //   "queryCount": 1,
  //   "resultsCount": 1,
  //   "adjusted": true,
  //   "results": [
  //   {
  //     "T": "AAPL",
  //     "v": 90132405,
  //     "vw": 238.8669,
  //     "o": 247.19,
  //     "c": 236,
  //     "h": 247.19,
  //     "l": 233.44,
  //     "t": 1738357200000,
  //     "n": 936587
  //   }
  // ],
  //   "status": "OK",
  //   "request_id": "...",
  //   "count": 1
  // }
  return {
    symbol: data.ticker,
    open: data.results[0].o,
    close: data.results[0].c,
    volume: data.results[0].v,
  };
};
