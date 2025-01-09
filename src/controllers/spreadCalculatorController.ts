import logger from '../logger';
import { BybitController } from './bybitController';
import { HyperliquidController } from './hyperliquidController';
import { BybitSymbol } from '../types/bybitTypes';
import { HyperliquidSymbol } from '../types/hyperliquidTypes';

interface SymbolPair {
  bybit: BybitSymbol | null;
  hyperliquid: HyperliquidSymbol | null;
}

export class SpreadCalculatorController {
  private bybitController: BybitController;
  private hyperliquidController: HyperliquidController;
  private symbolLinks: Map<string, SymbolPair>;

  constructor(
    bybitController: BybitController,
    hyperliquidController: HyperliquidController
  ) {
    this.bybitController = bybitController;
    this.hyperliquidController = hyperliquidController;
    this.symbolLinks = new Map();

    this.initializeSymbolLinks();
    this.subscribeToUpdates();
  }

  /**
   * Инициализация связок символов с обеих бирж
   */
  private initializeSymbolLinks(): void {
    const bybitSymbols = this.bybitController.getAllSymbols();
    const hyperliquidSymbols = this.hyperliquidController.getAllSymbols();

    logger.info('--- Инициализация связей символов начата ---');

    bybitSymbols.forEach((bybitSymbol) => {
      const hyperliquidSymbol = this.findMatchingSymbol(
        bybitSymbol,
        hyperliquidSymbols
      );
      this.symbolLinks.set(bybitSymbol.symbol, {
        bybit: bybitSymbol,
        hyperliquid: hyperliquidSymbol ?? null,
      });
    });

    logger.info('--- Инициализация связей символов завершена ---');
  }

  private findMatchingSymbol(
    bybitSymbol: BybitSymbol,
    hyperliquidSymbols: HyperliquidSymbol[]
  ): HyperliquidSymbol | undefined {
    return hyperliquidSymbols.find((sym) => {
      const hyperliquidBaseSymbol =
        sym.symbol[0] !== 'k'
          ? sym.symbol.split('-')[0]
          : '1000' + sym.symbol.slice(1);
      return hyperliquidBaseSymbol === bybitSymbol.symbol.split('/')[0];
    });
  }

  /**
   * Подписка на изменения данных
   */
  private subscribeToUpdates(): void {
    this.bybitController.updateSymbolData = (symbol, data) => {
      const currentPair = this.symbolLinks.get(symbol);
      if (currentPair) {
        currentPair.bybit = { ...currentPair.bybit, ...data } as BybitSymbol;
        this.calculateAndLogSpread(symbol);
      }
    };

    this.hyperliquidController.updateSymbolData = (symbol, data) => {
      const currentPair = this.symbolLinks.get(symbol);
      if (currentPair) {
        currentPair.hyperliquid = {
          ...currentPair.hyperliquid,
          ...data,
        } as HyperliquidSymbol;
        this.calculateAndLogSpread(symbol);
      }
    };
  }

  /**
   * Вычисление спреда между биржами и логирование результата
   * @param symbol - Название валютной пары
   */
  private calculateAndLogSpread(symbol: string): void {
    const symbolPair = this.symbolLinks.get(symbol);

    if (!symbolPair || !symbolPair.bybit || !symbolPair.hyperliquid) return;

    const {
      bestAsk: bestAskBybit,
      bestBid: bestBidBybit,
      VWAP: VWAPBybit,
      fundingRate: fundingRateBybit,
    } = symbolPair.bybit;

    const {
      bestAsk: bestAskHyperliquid,
      bestBid: bestBidHyperliquid,
      VWAP: VWAPHyperliquid,
      fundingRate: fundingRateHyperliquid,
    } = symbolPair.hyperliquid;

    const spreadBBA =
      bestAskBybit && bestBidHyperliquid
        ? bestAskBybit - bestBidHyperliquid
        : null;
    const spreadBBAPercentage =
      spreadBBA && bestBidHyperliquid
        ? `${this.formatNumber((spreadBBA / bestBidHyperliquid) * 100)}%`
        : 'N/A';

    const fundingRateSpread =
      fundingRateBybit && fundingRateHyperliquid
        ? fundingRateBybit - fundingRateHyperliquid
        : null;

    const vwapSpread =
      VWAPBybit && VWAPHyperliquid ? VWAPBybit - VWAPHyperliquid : null;

    const vwapSpreadPercentage =
      vwapSpread && VWAPHyperliquid
        ? `${this.formatNumber((vwapSpread / VWAPHyperliquid) * 100)}%`
        : 'N/A';

    const report = this.generateSpreadReport(
      symbol,
      bestBidHyperliquid,
      bestAskBybit,
      spreadBBA,
      spreadBBAPercentage,
      VWAPHyperliquid,
      VWAPBybit,
      vwapSpread,
      vwapSpreadPercentage,
      fundingRateSpread
    );

    console.log(report);
    logger.info(report);
  }

  /**
   * Форматирование чисел для отображения с динамической точностью
   */
  private formatNumber(value: number | null): string {
    if (value === null || isNaN(value)) {
      return 'N/A';
    }

    const absValue = Math.abs(value);

    if (absValue < 0.001) return value.toFixed(8);
    if (absValue < 0.1) return value.toFixed(6);
    if (absValue < 1000) return value.toFixed(4);
    return value.toFixed(2);
  }

  /**
   * Генерация отчета по спреду
   */
  private generateSpreadReport(
    symbol: string,
    bestBidHyperliquid: number | null,
    bestAskBybit: number | null,
    spreadBBA: number | null,
    spreadBBAPercentage: string,
    VWAPHyperliquid: number | null,
    VWAPBybit: number | null,
    vwapSpread: number | null,
    vwapSpreadPercentage: string,
    fundingRateSpread: number | null
  ): string {
    return `
=== ${symbol} Market Data ===

**1. Price Information:**
---------------------------------
| Exchange    | Price (USDT) | Funding Rate (%) |
|-------------|--------------|-----------------|
| Hyperliquid | ${this.formatNumber(bestBidHyperliquid).padStart(12)} | ${(fundingRateSpread ? fundingRateSpread * 100 : 0).toFixed(4).padStart(16)} |
| Bybit       | ${this.formatNumber(bestAskBybit).padStart(12)} | ${(fundingRateSpread ? fundingRateSpread * 100 : 0).toFixed(4).padStart(16)} |

**2. VWAP Information:**
---------------------------------
| Exchange    | VWAP Price (USDT) | Funding Rate (%) |
|-------------|-------------------|-----------------|
| Hyperliquid | ${this.formatNumber(VWAPHyperliquid).padStart(17)} | ${(fundingRateSpread ? fundingRateSpread * 100 : 0).toFixed(4).padStart(16)} |
| Bybit       | ${this.formatNumber(VWAPBybit).padStart(17)} | ${(fundingRateSpread ? fundingRateSpread * 100 : 0).toFixed(4).padStart(16)} |

**3. Calculated Spreads:**
---------------------------------
- **Spread BBA (Best Bid/Ask):** ${this.formatNumber(
      spreadBBA
    )} USDT (${spreadBBAPercentage})
- **Spread VWAP:** ${this.formatNumber(vwapSpread)} USDT (${vwapSpreadPercentage})
- **Funding Rate Difference:** ${this.formatNumber(
      fundingRateSpread ? fundingRateSpread * 100 : null
    )}%

---------------------------------
`;
  }
}
