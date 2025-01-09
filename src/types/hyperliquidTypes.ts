export interface HyperliquidSymbol {
  symbol: string;
  fundingRate: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  orderBook: HyperliquidOrderBook | null;
  VWAP: number | null;
}

export interface HyperliquidFundingRates {
  hyperliquidSymbols: string[];
  hyperliquidFundingRates: Record<string, number>;
}

export interface HyperliquidOrderBook {
  symbol: string;
  asks: [number, number][];
  bids: [number, number][];
}
