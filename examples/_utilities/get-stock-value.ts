export const getStockValue = async (params: { tickerSymbol: string }) => {
  return {
    symbol: params.tickerSymbol,
    open: 150,
    close: 160,
    volume: 1000,
  };
};
