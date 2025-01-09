import { BybitController } from './controllers/bybitController';
import { HyperliquidController } from './controllers/hyperliquidController';
import { setBybitControllerInstance } from './services/bybitWS';
import { setHyperliquidControllerInstance } from './services/hyperliquidWS';
import { SpreadCalculatorController } from './controllers/spreadCalculatorController';

import logger from './logger';

async function waitForSymbolsLoaded(controller: any, exchangeName: string) {
  return new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      const symbols = controller.getAllSymbols();
      if (symbols.length > 0) {
        logger.info(`${exchangeName} -> Символы загружены: ${symbols.length}`);
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });
}

async function main(): Promise<void> {
  try {
    logger.info('--- Старт ---');

    const bybitController = new BybitController();
    setBybitControllerInstance(bybitController);
    await bybitController.initializeWebSocketSubscriptions();

    const hyperliquidController = new HyperliquidController();
    setHyperliquidControllerInstance(hyperliquidController);
    await hyperliquidController.initializeWebSocketSubscriptions();

    await Promise.all([
      waitForSymbolsLoaded(bybitController, 'Bybit'),
      waitForSymbolsLoaded(hyperliquidController, 'Hyperliquid'),
    ]);

    logger.info('--- Инициализация связей символов начата ---');

    const spreadCalculator = new SpreadCalculatorController(
      bybitController,
      hyperliquidController
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? `${error.message}\n${error.stack}` : `${error}`;
    logger.error(`Произошла ошибка: ${errorMessage}`);
  }
}

void main();
