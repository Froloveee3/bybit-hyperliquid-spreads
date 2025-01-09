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
 * Получение списка perpetuals Hyperliquid
 * @returns {Promise<string[]>}
 */
export async function getHyperliquidPerpetuals(): Promise<string[]> {
  try {
    const perpetuals = await sdk.info.perpetuals.getMeta();
    const symbols: string[] = perpetuals.universe.map((perpetual: any) => perpetual.name);

    return symbols;
  } catch (error) {
    console.error('Не удалось получить perpetuals:', error);
    throw error;
  }
}
