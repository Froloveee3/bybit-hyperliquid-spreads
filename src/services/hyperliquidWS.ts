import WebSocket from 'ws';
import { HyperliquidController } from '../controllers/hyperliquidController';
import { calculateVWAP } from '../utils/calculations';
import { HyperliquidSymbol } from '../types/hyperliquidTypes';

let hyperliquidControllerInstance: HyperliquidController | null = null;

export function setHyperliquidControllerInstance(
  instance: HyperliquidController
) {
  hyperliquidControllerInstance = instance;
}

let hyperliquidWS: WebSocket;
const subscribedTopics: { type: string; coin?: string; interval?: string }[] =
  [];
let pingInterval: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

export function hyperliquidWSrestart() {
  if (hyperliquidWS) {
    hyperliquidWS.removeAllListeners();
    hyperliquidWS.terminate();
  }

  hyperliquidWS = new WebSocket('wss://api.hyperliquid.xyz/ws');

  hyperliquidWS.on('open', onOpen);
  hyperliquidWS.on('message', onMessage);
  hyperliquidWS.on('error', onError);
  hyperliquidWS.on('close', onClose);
}

export function hyperliquidWSsubscribe(
  subscriptions: { type: string; coin?: string; interval?: string }[]
) {
  if (hyperliquidWS.readyState !== WebSocket.OPEN) return;

  subscriptions.forEach((subscription) => {
    hyperliquidWS.send(JSON.stringify({ method: 'subscribe', subscription }));
    if (
      !subscribedTopics.find(
        (sub) => JSON.stringify(sub) === JSON.stringify(subscription)
      )
    ) {
      subscribedTopics.push(subscription);
    }
  });
}

export function hyperliquidWSunsubscribe(
  subscriptions: { type: string; coin?: string; interval?: string }[]
) {
  if (hyperliquidWS.readyState !== WebSocket.OPEN) return;

  subscriptions.forEach((subscription) => {
    hyperliquidWS.send(JSON.stringify({ method: 'unsubscribe', subscription }));
    const index = subscribedTopics.findIndex(
      (sub) => JSON.stringify(sub) === JSON.stringify(subscription)
    );
    if (index !== -1) {
      subscribedTopics.splice(index, 1);
    }
  });
}

const onOpen = () => {
  console.log('Hyperliquid WS connected');
  reconnectAttempts = 0;

  if (subscribedTopics.length > 0) {
    hyperliquidWSsubscribe(subscribedTopics);
  }

  if (pingInterval) clearInterval(pingInterval);

  pingInterval = setInterval(() => {
    if (hyperliquidWS.readyState === WebSocket.OPEN) hyperliquidWS.ping();
  }, 20000);
};

const onMessage = (message: WebSocket.MessageEvent) => {
  try {
    const data = JSON.parse(message.toString());

    if (data.channel === 'subscriptionResponse' && data.data.error) {
      console.warn(`Ошибка подписки: ${JSON.stringify(data.data)}`);
      return;
    }

    if (data.channel && hyperliquidControllerInstance) {
      const topicType = data.channel;

      if (topicType === 'l2Book') {
        const { coin, levels } = data.data;
        const symbol = `${coin}USDT`;

        const bids = levels[1]
          .slice(0, 3)
          .map((level: any) => [level.px, level.sz]);
        const asks = levels[0]
          .slice(0, 3)
          .map((level: any) => [level.px, level.sz]);

        if (bids.length !== 3 || asks.length !== 3) return;

        const VWAP = calculateVWAP({ symbol, bids, asks });

        const updatedData: Partial<HyperliquidSymbol> = {};

        updatedData.orderBook = { symbol, bids, asks };
        if (VWAP?.VWAP !== undefined) updatedData.VWAP = VWAP.VWAP;

        hyperliquidControllerInstance.updateSymbolData(symbol, updatedData);
      }

      if (topicType === 'activeAssetCtx') {
        const { coin, ctx } = data.data;
        const symbol = `${coin}USDT`;

        const { funding, impactPxs, midPx } = ctx;

        const updatedData: Partial<HyperliquidSymbol> = {};

        if (funding !== undefined)
          updatedData.fundingRate = parseFloat(funding);

        if (impactPxs?.length == 2) {
          updatedData.bestBid = parseFloat(impactPxs[0]);
          updatedData.bestAsk = parseFloat(impactPxs[1]);
        }

        if (midPx !== undefined) updatedData.midPrice = parseFloat(midPx);

        hyperliquidControllerInstance.updateSymbolData(symbol, updatedData);
      }
    } else {
      console.warn('Получено сообщение без валидного канала', data);
    }
  } catch (error) {
    console.error('Ошибка парсинга сообщения:', error);
  }
};

const onError = (error: WebSocket.ErrorEvent) => {
  console.error('Hyperliquid WS error:', error.message);
};

const onClose = (code: number, reason: string) => {
  console.warn(`Hyperliquid WS closed: ${code} - ${reason}`);

  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  reconnectAttempts += 1;
  const reconnectDelay = Math.min(5000 * reconnectAttempts, 60000);

  setTimeout(hyperliquidWSrestart, reconnectDelay);
};

process.on('uncaughtException', (error) => {
  console.error('Необработанная ошибка:', error);
  hyperliquidWSrestart();
});

process.on('SIGINT', () => {
  console.log('Завершение работы. Отключаем WebSocket.');
  if (hyperliquidWS) {
    hyperliquidWS.terminate();
  }
  process.exit(0);
});
