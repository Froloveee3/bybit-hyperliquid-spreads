import logger from '../logger';
import {
  HyperliquidFundingRates,
  HyperliquidOrderBook,
} from '../types/hyperliquidTypes';

const { Hyperliquid } = require('hyperliquid');

const sdk = new Hyperliquid({
  enableWs: false,
});

/**
 * Инициализация SDK Hyperliquid.
 * @returns {Promise<void>}
 */
export async function initializeHyperliquid(): Promise<void> {
  try {
    await sdk.initialize();
  } catch (error) {
    console.error('Не удалось инициализировать SDK Hyperliquid:', error);
    throw error;
  }
}

/**
 * Получение ставок финансирования (Funding Rates) Hyperliquid.
 * @returns Объект с массивом символов и ставками финансирования
 */
export async function getHyperliquidFundingRates(): Promise<HyperliquidFundingRates> {
  try {
    const predictedFundings = await sdk.info.perpetuals.getPredictedFundings();
    const symbols: Record<string, number> = {};

    predictedFundings.forEach((predictedFunding: any) => {
      const symbol = predictedFunding[0] + '-PERP';
      const fundingData = predictedFunding[1];

      if (fundingData) {
        const hlFundData = fundingData.find(
          ([exchange]: [string]) => exchange === 'HlPerp'
        );
        if (hlFundData) {
          symbols[symbol] = hlFundData[1].fundingRate;
        }
      }
    });

    return {
      hyperliquidSymbols: Object.keys(symbols),
      hyperliquidFundingRates: symbols,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Ошибка при получении ставок финансирования Hyperliquid: ${errorMessage}`
    );
    throw new Error(
      `Ошибка при получении ставок финансирования Hyperliquid: ${errorMessage}`
    );
  }
}

/**
 * Получение ордербука для символа Hyperliquid
 * @param symbol - Торговый символ (например, BTC-PERP)
 * @param limit - Лимит глубины ордербука
 * @returns Ордербук с уровнями заявок на покупку и продажу
 */
export async function getHyperliquidOrderBook(
  symbol: string,
  limit: number = 3
): Promise<HyperliquidOrderBook> {
  try {
    const orderBook = await sdk.info.getL2Book(symbol);

    return {
      symbol,
      bids: orderBook.levels[1]
        .slice(0, limit)
        .map((ask: any) => [ask.px, ask.sz]),
      asks: orderBook.levels[0]
        .slice(0, limit)
        .map((bid: any) => [bid.px, bid.sz]),
    };
  } catch (error) {
    console.error(`Не удалось получить ордербук для символа ${symbol}:`, error);
    throw error;
  }
}
