# Веб-API для интернет-магазина электроники

Веб-сервис (API) для обработки запросов интернет-магазина электроники, разработанный в рамках практической работы №3.

## Технологии

- Node.js
- Express.js
- SQLite3

## Установка и запуск

1. Установите зависимости:
```bash
npm install
```

2. Запустите сервер:
```bash
npm start
```

Для разработки с автоматической перезагрузкой:
```bash
npm run dev
```

Сервер будет доступен по адресу: `http://localhost:3000`

## API Endpoints

### GET методы

#### Получить все товары
```
GET /api/products
```

Параметры запроса:
- `category` (опционально) - фильтр по категории

Пример:
```
GET /api/products?category=Смартфоны
```

#### Получить товар по ID
```
GET /api/products/:id
```

Пример:
```
GET /api/products/1
```

#### Получить все заказы
```
GET /api/orders
```

#### Получить заказ по ID
```
GET /api/orders/:id
```

#### Получить все категории
```
GET /api/categories
```

### POST методы

#### Создать заказ
```
POST /api/orders
```

Тело запроса:
```json
{
  "clientName": "Иван Иванов",
  "clientEmail": "ivan@example.com",
  "clientPhone": "+7 999 123 45 67",
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

#### Добавить товар
```
POST /api/products
```

Тело запроса:
```json
{
  "name": "Название товара",
  "description": "Описание товара",
  "price": 10000,
  "category": "Смартфоны",
  "inStock": 10
}
```

## Примеры использования

### Получение всех товаров
```bash
curl http://localhost:3000/api/products
```

### Создание заказа
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Иван Иванов",
    "clientEmail": "ivan@example.com",
    "clientPhone": "+7 999 123 45 67",
    "items": [
      {"productId": 1, "quantity": 1}
    ]
  }'
```

### Добавление товара
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Новый товар",
    "description": "Описание",
    "price": 5000,
    "category": "Аксессуары",
    "inStock": 20
  }'
```

## Структура базы данных

### Таблица products
- id (INTEGER, PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- price (REAL)
- category (TEXT)
- inStock (INTEGER)
- createdAt (DATETIME)

### Таблица orders
- id (INTEGER, PRIMARY KEY)
- clientName (TEXT)
- clientEmail (TEXT)
- clientPhone (TEXT)
- totalAmount (REAL)
- status (TEXT)
- createdAt (DATETIME)

### Таблица order_items
- id (INTEGER, PRIMARY KEY)
- orderId (INTEGER, FOREIGN KEY)
- productId (INTEGER, FOREIGN KEY)
- quantity (INTEGER)
- price (REAL)


