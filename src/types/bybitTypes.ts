import { FundingRates } from 'ccxt';

export interface BybitSymbol {
  symbol: string;
  fundingRate: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  orderBook: BybitOrderBook | null;
  VWAP: number | null;
}

export interface BybitFundingRates {
  bybitSymbols: string[];
  bybitFundingRates: FundingRates;
}

export interface BybitOrderBook {
  symbol: string;
  asks: [string, string][];
  bids: [string, string][];
}