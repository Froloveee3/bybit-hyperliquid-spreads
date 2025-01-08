import {
  getBybitFundingRates,
  getBybitOrderBook,
} from '../services/bybitService';
import logger from '../logger';
import { getOrderBookInfo, calculateVWAP } from '../utils/calculations';
import { BybitSymbol } from '../types/bybitTypes';
import cliProgress from 'cli-progress';

export class BybitController {
  private symbols: Map<string, BybitSymbol>;

  constructor() {
    this.symbols = new Map();
  }

  /**
   * Получение данных по торговым парам с Bybit
   */
  async fetchPairsData(): Promise<void> {
    logger.info('Bybit -> Начало обновления данных...');

    try {
      const { bybitSymbols, bybitFundingRates } = await getBybitFundingRates();

      for (const symbol of bybitSymbols) {
        const fundingRate = bybitFundingRates[symbol]?.fundingRate ?? 0;

        this.symbols.set(symbol, {
          symbol: symbol,
          fundingRate,
          bestBid: null,
          bestAsk: null,
          midPrice: null,
          orderBook: null,
          VWAP: null,
        });
      }

      await this.updateSymbolData();
      logger.info('Bybit -> Данные успешно обновлены!');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `${error.message}\n${error.stack}`
          : `${error}`;
      logger.error(`Bybit -> Ошибка при обновлении данных: ${errorMessage}`);
      throw new Error(`Bybit -> Обновление данных не удалось: ${errorMessage}`);
    }
  }

  /**
   * Обновление ордербуков для всех торговых пар
   */
  private async updateSymbolData(): Promise<void> {
    try {
      const symbols = Array.from(this.symbols.keys());

      const progressBar = new cliProgress.SingleBar(
        {
          format:
            'Bybit -> Обновление ордербука | {bar} | {percentage}% | {value}/{total} пар',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic
      );

      progressBar.start(symbols.length, 0);

      const promises = symbols.map((symbol) =>
        (async () => {
          try {
            const orderBook = await getBybitOrderBook(symbol);
            if (!orderBook) {
              throw new Error(`Ордербук для ${symbol} не получен или пуст`);
            }

            const orderBookInfo = getOrderBookInfo(orderBook);
            const VWAPInfo = calculateVWAP(orderBook);

            if (!orderBookInfo || !VWAPInfo) {
              throw new Error(
                `Недостаточно данных для расчета VWAP или Mid Price для ${symbol}`
              );
            }

            const { bestBid, bestAsk, midPrice } = orderBookInfo;
            const { VWAP } = VWAPInfo;

            const updatedSymbol = this.symbols.get(symbol);
            if (updatedSymbol) {
              updatedSymbol.bestBid = bestBid;
              updatedSymbol.bestAsk = bestAsk;
              updatedSymbol.midPrice = midPrice;
              updatedSymbol.orderBook = orderBook;
              updatedSymbol.VWAP = VWAP;
            }

            progressBar.update(symbols.indexOf(symbol) + 1);
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? `${error.message}\n${error.stack}`
                : `${error}`;
            logger.error(
              `Ошибка при обновлении ордербука для пары ${symbol}: ${errorMessage}`
            );
          }
        })()
      );

      await Promise.allSettled(promises);

      progressBar.stop();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `${error.message}\n${error.stack}`
          : `${error}`;
      logger.error(
        `Bybit -> Ошибка при обновлении ордербуков: ${errorMessage}`
      );
      throw new Error(`Bybit -> Ошибка обновления ордербуков: ${errorMessage}`);
    }
  }

  /**
   * Получение всех символов
   * @returns Массив символов Bybit
   */
  getAllSymbols(): BybitSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Получение данных символа по названию
   * @param symbol - Название торговой пары
   * @returns Данные по символу или undefined
   */
  getSymbol(symbol: string): BybitSymbol | undefined {
    return this.symbols.get(symbol);
  }
}
