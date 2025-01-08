import {
  initializeHyperliquid,
  getHyperliquidFundingRates,
  getHyperliquidOrderBook,
} from '../services/hyperliquidService';
import logger from '../logger';
import { getOrderBookInfo, calculateVWAP } from '../utils/calculations';
import { HyperliquidSymbol } from '../types/hyperliquidTypes';
import cliProgress from 'cli-progress';

export class HyperliquidController {
  private symbols: Map<string, HyperliquidSymbol>;

  constructor() {
    this.symbols = new Map();
  }

  /**
   * Получение данных по торговым парам с Hyperliquid
   */
  async fetchPairsData(): Promise<void> {
    logger.info('Hyperliquid -> Начало обновления данных...');

    try {
      await initializeHyperliquid();

      const { hyperliquidSymbols, hyperliquidFundingRates } =
        await getHyperliquidFundingRates();

      for (const symbol of hyperliquidSymbols) {
        const fundingRate = hyperliquidFundingRates[symbol] || 0;

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
      logger.info('Hyperliquid -> Данные успешно обновлены!');
    } catch (error) {
      logger.error('Hyperliquid -> Ошибка при обновлении данных:', error);
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
            'Hyperliquid -> Обновление ордербука | {bar} | {percentage}% | {value}/{total} пар',
          barCompleteChar: '\u2588',
          barIncompleteChar: '\u2591',
          hideCursor: true,
        },
        cliProgress.Presets.shades_classic
      );

      progressBar.start(symbols.length, 0);

      for (const [index, symbol] of symbols.entries()) {
        try {
          const orderBook = await getHyperliquidOrderBook(symbol);
          const orderBookInfo = getOrderBookInfo(orderBook);
          const VWAPInfo = calculateVWAP(orderBook);

          if (!orderBookInfo || !VWAPInfo) continue;

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

          progressBar.update(index + 1);
        } catch (error) {
          logger.error(
            `Ошибка при обновлении книги ордеров для пары ${symbol}:`,
            error
          );
        }
      }

      progressBar.stop();
    } catch (error) {
      logger.error('Ошибка при обновлении данных символов:', error);
    }
  }

  /**
   * Получение всех символов
   * @returns {HyperliquidSymbol[]}
   */
  getAllSymbols(): HyperliquidSymbol[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Получение данных символа по названию
   * @param symbol - Название торговой пары
   * @returns Данные по символу или undefined
   */
  getSymbol(symbol: string): HyperliquidSymbol | undefined {
    return this.symbols.get(symbol);
  }
}
