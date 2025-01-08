## Установка

1. Клонируйте репозиторий:
    ```sh
    git clone https://github.com/Froloveee3/bybit-hyperliquid-spreads.git
    cd bybit-hyperliquid-spreads
    ```

2. Установите зависимости:
    ```sh
    npm install
    ```

## Скрипты

- `build`: Компилирует код TypeScript в JavaScript.
    ```sh
    npm run build
    ```

- `start`: Запускает скомпилированный JavaScript код.
    ```sh
    npm start
    ```

- `dev`: Запускает код TypeScript напрямую с использованием `ts-node`.
    ```sh
    npm run dev
    ```

## Конфигурация

- Конфигурация Prettier: `.prettierrc`
- Конфигурация TypeScript: `tsconfig.json`

## Логирование

Логи хранятся в директории /logs:
- `errors.log`: Логи сообщений об ошибках.
- `exceptions.log`: Логи необработанных исключений.
- `output.log`: Логи общей информации.
- `rejections.log`: Логи необработанных отклонений промисов.

## Использование

1. Запустите приложение:
    ```sh
    npm run dev
    ```

2. Приложение будет получать торговые данные от Bybit и Hyperliquid, рассчитывать спреды и записывать результаты в лог.

## Обзор кода

### Контроллеры

- `BybitController`: Обрабатывает получение и обновление торговых данных от Bybit.
- `HyperliquidController`: Обрабатывает получение и обновление торговых данных от Hyperliquid.
- `SpreadCalculatorController`: Рассчитывает и записывает спреды между Bybit и Hyperliquid.

### Сервисы

- `bybitService`: Предоставляет функции для взаимодействия с API Bybit.
- `hyperliquidService`: Предоставляет функции для взаимодействия с API Hyperliquid.

### Утилиты

- `calculations`: Содержит функции для расчета информации по ордербуку и VWAP.

### Типы

- `bybitTypes`: Содержит интерфейсы TypeScript для данных Bybit.
- `globalTypes`: Содержит глобальные интерфейсы TypeScript.
- `hyperliquidTypes`: Содержит интерфейсы TypeScript для данных Hyperliquid.

### Логгер

- `logger.ts`: Конфигурирует и экспортирует логгер Winston для записи сообщений в лог.

### Точка входа

- `index.ts`: Главная точка входа в приложение. Инициализирует контроллеры и запускает процесс получения данных и расчета спредов.
