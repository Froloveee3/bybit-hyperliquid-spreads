import { OrderBook } from 'ccxt';
import { BybitOrderBook } from '../types/bybitTypes';
import { VWAPInfo } from '../types/globalTypes';


/**
 * Вычисление VWAP для ордербука
 * @param orderBook - Ордербук биржи Bybit или Hyperliquid
 * @returns Объект с VWAP или null, если ордербук пустой
 */
export function calculateVWAP(orderBook: BybitOrderBook): VWAPInfo | null {
  const topLevels = 3;

  const combinedOrders = [...orderBook.bids.slice(0, topLevels), ...orderBook.asks.slice(0, topLevels)];

  const volumeSum = combinedOrders.reduce((sum, [, volume]) => sum + parseFloat(volume), 0);
  const priceVolumeSum = combinedOrders.reduce((sum, [price, volume]) => sum + parseFloat(price) * parseFloat(volume), 0);

  if (volumeSum === 0) return null;

  return { VWAP: priceVolumeSum / volumeSum };
}