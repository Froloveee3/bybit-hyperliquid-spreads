import { BybitController } from './controllers/bybitController';
import { HyperliquidController } from './controllers/hyperliquidController';
import { SpreadCalculatorController } from './controllers/spreadCalculatorController';
import logger from './logger';

async function main(): Promise<void> {
  try {
    logger.info('--- Старт программы ---');

    const hyperliquidController = new HyperliquidController();
    const bybitController = new BybitController();

    await hyperliquidController.fetchPairsData();
    await bybitController.fetchPairsData();

    const spreadCalculator = new SpreadCalculatorController(
      bybitController,
      hyperliquidController
    );

    await spreadCalculator.calculateAndLogSpreads();

    logger.info('--- Конец программы ---');
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? `${error.message}\n${error.stack}` : `${error}`;
    logger.error(`Произошла ошибка: ${errorMessage}`);
  }
}

void main();
