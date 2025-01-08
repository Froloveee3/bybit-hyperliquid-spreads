import { FundingRates, OrderBook } from 'ccxt';

export interface BybitSymbol {
  symbol: string;
  fundingRate: number;
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  orderBook: OrderBook | null;
  VWAP: number | null;
}

export interface BybitFundingRates {
  bybitSymbols: string[];
  bybitFundingRates: FundingRates;
}
