import { OrderBook as BybitOrderBook } from 'ccxt';
import { HyperliquidOrderBook } from '../types/hyperliquidTypes';
import { OrderBookInfo, VWAPInfo } from '../types/globalTypes';

/**
 * Получение информации о лучшем бид/аск и средней цене
 * @param orderBook - Ордербук биржи Bybit или Hyperliquid
 * @returns Объект с лучшими бидом/аском и средней ценой или null, если ордербук пустой
 */
export function getOrderBookInfo(
  orderBook: BybitOrderBook | HyperliquidOrderBook
): OrderBookInfo | null {
  if (!orderBook.bids.length || !orderBook.asks.length) {
    return null;
  }

  const bestBid = orderBook.bids[0]?.[0] ?? 0;
  const bestAsk = orderBook.asks[0]?.[0] ?? 0;

  if (bestBid === 0 || bestAsk === 0) {
    return null;
  }

  const midPrice = (bestBid + bestAsk) / 2;

  return {
    bestBid,
    bestAsk,
    midPrice,
  };
}

/**
 * Вычисление VWAP для ордербука
 * @param orderBook - Ордербук биржи Bybit или Hyperliquid
 * @returns Объект с VWAP или null, если ордербук пустой
 */
export function calculateVWAP(
  orderBook: BybitOrderBook | HyperliquidOrderBook
): VWAPInfo | null {
  if (!orderBook.bids.length && !orderBook.asks.length) {
    return null;
  }

  let volumeSum = 0;
  let priceVolumeSum = 0;

  for (const [price, volume] of orderBook.bids) {
    if (price && volume) {
      priceVolumeSum += price * volume;
      volumeSum += volume;
    }
  }

  for (const [price, volume] of orderBook.asks) {
    if (price && volume) {
      priceVolumeSum += price * volume;
      volumeSum += volume;
    }
  }

  if (volumeSum === 0) return null;

  const VWAP = priceVolumeSum / volumeSum;

  return {
    VWAP,
  };
}
