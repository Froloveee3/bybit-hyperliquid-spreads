import ccxt, { OrderBook as BybitOrderBook } from 'ccxt';
import { BybitFundingRates } from '../types/bybitTypes';
import logger from '../logger';

/**
 * Инициализация клиента Bybit с параметром по умолчанию 'swap'
 */
const bybit = new ccxt.bybit({
  options: {
    defaultType: 'swap',
  },
});

/**
 * Получение ставок финансирования (Funding Rates) Bybit
 * @returns Объект с массивом символов и ставками финансирования
 */
export async function getBybitFundingRates(): Promise<BybitFundingRates> {
  try {
    const fundingRates = await bybit.fetchFundingRates();

    return {
      bybitSymbols: Object.keys(fundingRates),
      bybitFundingRates: fundingRates,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Ошибка при получении ставок финансирования Bybit: ${errorMessage}`
    );
    throw new Error(
      `Ошибка при получении ставок финансирования Bybit: ${errorMessage}`
    );
  }
}

/**
 * Получение ордербука для символа Bybit
 * @param symbol - Торговый символ (например, BTC/USDT:USDT)
 * @param limit - Лимит глубины ордербука
 * @returns Ордербук с уровнями заявок на покупку и продажу
 */
export async function getBybitOrderBook(
  symbol: string,
  limit: number = 3
): Promise<BybitOrderBook> {
  try {
    const orderBook = await bybit.fetchOrderBook(symbol, limit);

    if (!orderBook || (!orderBook.bids.length && !orderBook.asks.length)) {
      throw new Error(`Ордербук для символа ${symbol} пуст или недоступен`);
    }

    return orderBook;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Ошибка при получении ордербука Bybit для символа ${symbol}: ${errorMessage}`
    );
    throw new Error(
      `Ошибка при получении ордербука Bybit для символа ${symbol}: ${errorMessage}`
    );
  }
}
