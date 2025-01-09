import ccxt from 'ccxt';
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
 * Получение списка perpetuals Bybit
 * @returns {Promise<string[]>}
 */
export async function getBybitPerpetuals(): Promise<string[]> {
  try {
    const perpetualsRates = await bybit.fetchFundingRates();

    return Object.keys(perpetualsRates);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Ошибка при получении perpetuals Bybit: ${errorMessage}`);
    throw new Error(`Ошибка при получении perpetuals Bybit: ${errorMessage}`);
  }
}
