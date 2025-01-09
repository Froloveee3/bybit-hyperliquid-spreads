import { getBybitPerpetuals } from '../services/bybitService';
import { bybitWSrestart, bybitWSsubscribe, bybitWSunsubscribe } from '../services/bybitWS';
import logger from '../logger';
import { BybitSymbol } from '../types/bybitTypes';

export class BybitController {
  private symbols: Map<string, BybitSymbol>;
  private orderBookDepth: number = 500;

  constructor() {
    this.symbols = new Map();
  }

  /**
   * Инициализация WebSocket и подписка на обновления по всем валютным парам.
   */
  async initializeWebSocketSubscriptions(): Promise<void> {
    logger.info('Bybit -> Инициализация WebSocket и подписка на топики...');

    try {
      bybitWSrestart();

      setTimeout(async () => {
        const bybitPerpetuals = await getBybitPerpetuals();
        const topics: string[] = [];

        for (const symbol of bybitPerpetuals) {
          if (!symbol.includes('USDT')) continue;

          const formattedSymbol = symbol.split(':')[0].replace('/', '');

          this.symbols.set(formattedSymbol, {
            symbol: formattedSymbol,
            fundingRate: null,
            bestBid: null,
            bestAsk: null,
            midPrice: null,
            orderBook: null,
            VWAP: null,
          });

          topics.push(`tickers.${formattedSymbol}`);
          topics.push(`orderbook.${this.orderBookDepth}.${formattedSymbol}`);
        }

        bybitWSsubscribe(topics);

        logger.info('Bybit -> Подписка на все символы завершена.');
      }, 2000);
    } catch (error) {
      logger.error(`Bybit -> Ошибка при подписке на WebSocket: ${error}`);
      throw new Error(`Bybit -> Подписка на WebSocket не удалась: ${error}`);
    }
  }

  /**
   * Обновление данных по символу
   * @param symbol - Символ торговой пары
   * @param data - Данные для обновления
   */
  updateSymbolData(symbol: string, data: Partial<BybitSymbol>): void {
    const existingSymbol = this.symbols.get(symbol);

    if (existingSymbol) {
      this.symbols.set(symbol, { ...existingSymbol, ...data });
    }
  }

  /**
   * Отписка от топиков по символу
   * @param symbol - Символ для отписки
   */
  unsubscribeSymbol(symbol: string): void {
    const tickerTopic = `tickers.${symbol}`;
    const orderbookTopic = `orderbook.${this.orderBookDepth}.${symbol}`;

    bybitWSunsubscribe([tickerTopic, orderbookTopic]);
    logger.info(`Bybit -> Отписка от топиков: ${tickerTopic}, ${orderbookTopic}`);
  }

  /**
   * Подписка на новый символ
   * @param symbol - Символ для подписки
   */
  subscribeSymbol(symbol: string): void {
    const tickerTopic = `tickers.${symbol}`;
    const orderbookTopic = `orderbook.${this.orderBookDepth}.${symbol}`;

    bybitWSsubscribe([tickerTopic, orderbookTopic]);
    logger.info(`Bybit -> Подписка на символ: ${tickerTopic}, ${orderbookTopic}`);
  }

  /**
   * Получение всех символов
   * @returns Массив символов Bybit
   */
  getAllSymbols(): BybitSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Получение данных по символу
   * @param symbol - Название торговой пары
   * @returns Данные по символу или undefined
   */
  getSymbol(symbol: string): BybitSymbol | undefined {
    return this.symbols.get(symbol);
  }

  /**
   * Отписка от всех символов
   */
  unsubscribeAllSymbols(): void {
    const topics = Array.from(this.symbols.keys()).flatMap((symbol) => [
      `tickers.${symbol}`,
      `orderbook.${this.orderBookDepth}.${symbol}`,
    ]);

    bybitWSunsubscribe(topics);
    logger.info('Bybit -> Отписка от всех топиков завершена.');
  }
}
