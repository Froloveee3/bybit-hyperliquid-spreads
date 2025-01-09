import {
  hyperliquidWSrestart,
  hyperliquidWSsubscribe,
  hyperliquidWSunsubscribe,
} from '../services/hyperliquidWS';

import logger from '../logger';
import { HyperliquidSymbol } from '../types/hyperliquidTypes';
import { getHyperliquidPerpetuals, initializeHyperliquid } from '../services/hyperliquidService';

export class HyperliquidController {
  private symbols: Map<string, HyperliquidSymbol>;

  constructor() {
    this.symbols = new Map();
  }

  /**
   * Инициализация WebSocket и подписка на обновления по всем валютным парам.
   */
  async initializeWebSocketSubscriptions(): Promise<void> {
    logger.info('hyperliquid -> Инициализация WebSocket и подписка на топики...');

    try {
      hyperliquidWSrestart();

      setTimeout(async () => {
        await initializeHyperliquid();
        const hyperliquidPerpetuals = await getHyperliquidPerpetuals();

        const topics: { type: string; coin?: string; interval?: string }[] = [];
        for (const symbol of hyperliquidPerpetuals) {
          const keySymbol = symbol.split('-')[0] + 'USDT';
          const formattedSymbol = symbol.split('-')[0];

          this.symbols.set(keySymbol, {
            symbol: keySymbol,
            fundingRate: null,
            bestBid: null,
            bestAsk: null,
            midPrice: null,
            orderBook: null,
            VWAP: null,
          });

          topics.push({type: 'activeAssetCtx', coin: formattedSymbol});
          topics.push({type: 'l2Book', coin: formattedSymbol});
        }

        hyperliquidWSsubscribe(topics);

        logger.info('hyperliquid -> Подписка на все символы завершена.');
      }, 2000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `${error.message}\n${error.stack}`
          : `${error}`;
      logger.error(
        `hyperliquid -> Ошибка при подписке на WebSocket: ${errorMessage}`
      );
      throw new Error(
        `hyperliquid -> Подписка на WebSocket не удалась: ${errorMessage}`
      );
    }
  }

  updateSymbolData(symbol: string, data: Partial<HyperliquidSymbol>): void {
    const existingSymbol = this.symbols.get(symbol);

    if (existingSymbol) {
      this.symbols.set(symbol, { ...existingSymbol, ...data });
    }
  }

  /**
   * Отписка от топиков.
   * @param symbol - Символ для отписки
   */
  unsubscribeSymbol(subscriptions: { type: string; coin?: string; interval?: string }[]): void {
    hyperliquidWSunsubscribe(subscriptions);
    logger.info(`hyperliquid -> Отписка от топиков: ${subscriptions}`);
  }

  /**
   * Получение всех символов
   * @returns Массив символов hyperliquid
   */
  getAllSymbols(): HyperliquidSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Получение данных по символу
   * @param symbol - Название торговой пары
   * @returns Данные по символу или undefined
   */
  getSymbol(symbol: string): HyperliquidSymbol | undefined {
    return this.symbols.get(symbol);
  }
}
