import WebSocket from 'ws';
import { BybitController } from '../controllers/bybitController';
import { calculateVWAP } from '../utils/calculations';
import { BybitSymbol } from '../types/bybitTypes';

const MAX_TOPICS_PER_CONNECTION = 100;
const tickersTrackedFields = ['fundingRate', 'bid1Price', 'ask1Price'];

let bybitControllerInstance: BybitController | null = null;

export function setBybitControllerInstance(instance: BybitController) {
  bybitControllerInstance = instance;
}

interface WebSocketConnection {
  ws: WebSocket;
  topics: string[];
  pingInterval: NodeJS.Timeout | null;
}

let connections: WebSocketConnection[] = [];

/**
 * Создание WebSocket-соединения
 * @param topics - Список топиков для подписки
 */
function createWebSocketConnection(topics: string[]) {
  const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');
  const connection: WebSocketConnection = {
    ws,
    topics,
    pingInterval: null,
  };

  ws.on('open', () => onOpen(connection));
  ws.on('message', onMessage);
  ws.on('error', onError);
  ws.on('close', () => onClose(connection));

  connections.push(connection);
}

/**
 * Перезапуск всех WebSocket соединений
 */
export function bybitWSrestart() {
  connections.forEach(({ ws }) => {
    ws.removeAllListeners();
    ws.terminate();
  });
  connections = [];
}

/**
 * Подписка на топики с разделением на несколько соединений
 * @param topics - Список топиков
 */
export function bybitWSsubscribe(topics: string[]) {
  const chunkedTopics = chunkArray(topics, MAX_TOPICS_PER_CONNECTION);

  chunkedTopics.forEach((chunk) => {
    createWebSocketConnection(chunk);
  });
}

/**
 * Отписка от топиков
 * @param topics - Список топиков для отписки
 */
export function bybitWSunsubscribe(topics: string[]) {
  connections.forEach(({ ws, topics: connectionTopics }) => {
    const unsubscribeTopics = topics.filter((topic) =>
      connectionTopics.includes(topic)
    );

    if (unsubscribeTopics.length > 0) {
      ws.send(JSON.stringify({ op: 'unsubscribe', args: unsubscribeTopics }));
    }
  });
}

/**
 * Подключение WebSocket
 */
const onOpen = (connection: WebSocketConnection) => {
  console.log('Bybit WS connected');
  connection.ws.send(JSON.stringify({ op: 'subscribe', args: connection.topics }));

  if (connection.pingInterval) clearInterval(connection.pingInterval);

  connection.pingInterval = setInterval(() => {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({ op: 'ping' }));
    }
  }, 20000);
};

/**
 * Обработка сообщений WebSocket
 */
const onMessage = (message: WebSocket.MessageEvent) => {
  try {
    const data = JSON.parse(message.toString());

    if (data.success === false && data.ret_msg) {
      console.warn(`Ошибка при подписке на топик:`, data.ret_msg);
      return;
    }

    if (data && data.topic && bybitControllerInstance) {
      const topic = data.topic;

      if (topic.startsWith('tickers.')) {
        const symbol = topic.split('.')[1];
        const hasTrackedFields = tickersTrackedFields.some((field) =>
          data.data.hasOwnProperty(field)
        );

        if (!hasTrackedFields) return;

        const { fundingRate, bid1Price: bestBid, ask1Price: bestAsk } = data.data;

        const updatedData: Partial<BybitSymbol> = {};
        if (fundingRate !== undefined) updatedData.fundingRate = parseFloat(fundingRate);
        if (bestBid !== undefined) updatedData.bestBid = parseFloat(bestBid);
        if (bestAsk !== undefined) updatedData.bestAsk = parseFloat(bestAsk);
        if (bestBid !== undefined && bestAsk !== undefined) {
          updatedData.midPrice = (parseFloat(bestBid) + parseFloat(bestAsk)) / 2;
        }

        bybitControllerInstance.updateSymbolData(symbol, updatedData);
      }

      if (topic.startsWith('orderbook.')) {
        const symbol = topic.split('.')[2];
        let { b: bids, a: asks } = data.data;

        if (!bids || !asks) return;

        bids = bids.slice(0, 3);
        asks = asks.slice(0, 3);

        const VWAP = calculateVWAP({ symbol, bids, asks });

        bybitControllerInstance.updateSymbolData(symbol, {
          orderBook: { symbol, bids, asks },
          VWAP: VWAP?.VWAP ?? null,
        });
      }
    }
  } catch (error) {
    console.error('Ошибка парсинга сообщения:', error);
  }
};

/**
 * Обработка ошибок WebSocket
 */
const onError = (error: WebSocket.ErrorEvent) => {
  console.error('Bybit WS error:', error.message);
};

/**
 * Обработка закрытия WebSocket
 */
const onClose = (connection: WebSocketConnection) => {
  console.warn('Bybit WS closed');

  if (connection.pingInterval) {
    clearInterval(connection.pingInterval);
  }

  setTimeout(() => {
    createWebSocketConnection(connection.topics);
  }, 5000);
};

/**
 * Разбивает массив на подмассивы заданного размера
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}
