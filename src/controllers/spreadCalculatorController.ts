import logger from '../logger';
import { BybitController } from './bybitController';
import { HyperliquidController } from './hyperliquidController';
import { BybitSymbol } from '../types/bybitTypes';
import { HyperliquidSymbol } from '../types/hyperliquidTypes';

export class SpreadCalculatorController {
  private bybitController: BybitController;
  private hyperliquidController: HyperliquidController;

  constructor(
    bybitController: BybitController,
    hyperliquidController: HyperliquidController
  ) {
    this.bybitController = bybitController;
    this.hyperliquidController = hyperliquidController;
  }

  /**
   * Форматирование чисел для отображения с динамической точностью
   */
  formatNumber(value: number | null): string {
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
   * Вычисление процента спреда на основе цены
   */
  calculatePercentage(spread: number | null, basePrice: number | null): string {
    if (spread === null || basePrice === null || basePrice === 0) {
      return 'N/A';
    }
    const percentage = (spread / basePrice) * 100;
    return `${this.formatNumber(percentage)}%`;
  }

  /**
   * Расчет и логирование спредов между биржами
   */
  async calculateAndLogSpreads(): Promise<void> {
    logger.info('--- Начало расчета спредов между биржами ---');

    const bybitSymbols = this.bybitController.getAllSymbols();
    const hyperliquidSymbols = this.hyperliquidController.getAllSymbols();

    for (const bybitSymbol of bybitSymbols) {
      const hyperliquidSymbol = this.findMatchingSymbol(
        bybitSymbol,
        hyperliquidSymbols
      );

      if (hyperliquidSymbol) {
        const {
          bestBid: bestBidBybit,
          bestAsk: bestAskBybit,
          midPrice: midPriceBybit,
          VWAP: VWAPBybit,
          fundingRate: fundingRateBybit,
        } = bybitSymbol;

        const {
          bestBid: bestBidHyperliquid,
          bestAsk: bestAskHyperliquid,
          midPrice: midPriceHyperliquid,
          VWAP: VWAPHyperliquid,
          fundingRate: fundingRateHyperliquid,
        } = hyperliquidSymbol;

        const spreadBidAsk1 =
          bestBidHyperliquid && bestAskBybit
            ? bestAskBybit - bestBidHyperliquid
            : null;
        const spreadBidAsk2 =
          bestBidBybit && bestAskHyperliquid
            ? bestAskHyperliquid - bestBidBybit
            : null;

        const spreadBidAsk1Percentage = this.calculatePercentage(
          spreadBidAsk1,
          bestAskBybit
        );
        const spreadBidAsk2Percentage = this.calculatePercentage(
          spreadBidAsk2,
          bestAskHyperliquid
        );

        const fundingRateSpread = fundingRateBybit - fundingRateHyperliquid;

        const midPriceSpread =
          midPriceBybit && midPriceHyperliquid
            ? midPriceBybit - midPriceHyperliquid
            : null;
        const vwapSpread =
          VWAPBybit && VWAPHyperliquid ? VWAPBybit - VWAPHyperliquid : null;

        const report = this.generateSpreadReport(
          bybitSymbol.symbol,
          midPriceBybit,
          fundingRateBybit,
          midPriceHyperliquid,
          fundingRateHyperliquid,
          VWAPBybit,
          VWAPHyperliquid,
          spreadBidAsk1,
          spreadBidAsk1Percentage,
          spreadBidAsk2,
          spreadBidAsk2Percentage,
          vwapSpread,
          fundingRateSpread
        );

        console.log(report);
        logger.info(report);
      }
    }

    logger.info('--- Расчет спредов между биржами завершен ---');
  }

  /**
   * Нахождение соответствующего символа Hyperliquid для Bybit
   */
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
   * Генерация отчета по спреду
   */
  private generateSpreadReport(
    symbol: string,
    midPriceBybit: number | null,
    fundingRateBybit: number,
    midPriceHyperliquid: number | null,
    fundingRateHyperliquid: number,
    VWAPBybit: number | null,
    VWAPHyperliquid: number | null,
    spreadBidAsk1: number | null,
    spreadBidAsk1Percentage: string,
    spreadBidAsk2: number | null,
    spreadBidAsk2Percentage: string,
    vwapSpread: number | null,
    fundingRateSpread: number
  ): string {
    return `
=== ${symbol} Market Data ===

**1. Price Information:**
---------------------------------
| Exchange    | Price (USDT) | Funding Rate (%) |
|-------------|--------------|-----------------|
| Hyperliquid | ${this.formatNumber(midPriceHyperliquid).padStart(12)} | ${(fundingRateHyperliquid * 100).toFixed(4).padStart(16)} |
| Bybit       | ${this.formatNumber(midPriceBybit).padStart(12)} | ${(fundingRateBybit * 100).toFixed(4).padStart(16)} |

**2. VWAP Information:**
---------------------------------
| Exchange    | VWAP Price (USDT) | Funding Rate (%) |
|-------------|-------------------|-----------------|
| Hyperliquid | ${this.formatNumber(VWAPHyperliquid).padStart(17)} | ${(fundingRateHyperliquid * 100).toFixed(4).padStart(16)} |
| Bybit       | ${this.formatNumber(VWAPBybit).padStart(17)} | ${(fundingRateBybit * 100).toFixed(4).padStart(16)} |

**3. Calculated Spreads:**
---------------------------------
- **Spread BBA (Best Bid Hyperliquid vs Ask Bybit):** ${this.formatNumber(spreadBidAsk1)} USDT (${spreadBidAsk1Percentage})
- **Spread BBA (Best Bid Bybit vs Ask Hyperliquid):** ${this.formatNumber(spreadBidAsk2)} USDT (${spreadBidAsk2Percentage})
- **Spread VWAP:** ${this.formatNumber(vwapSpread)} USDT
- **Funding Rate Difference:** ${(fundingRateSpread * 100).toFixed(4)}%

---------------------------------
`;
  }
}
