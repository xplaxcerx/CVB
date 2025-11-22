# Инструкция по установке и запуску

## Требования
- Node.js (версия 14 или выше)
- npm (устанавливается вместе с Node.js)

## Установка

1. Откройте терминал в папке `111/web-api`

2. Установите зависимости:
```bash
npm install
```

## Запуск

### Обычный режим
```bash
npm start
```

### Режим разработки (с автоматической перезагрузкой)
```bash
npm run dev
```

Сервер будет доступен по адресу: `http://localhost:3000`

## Проверка работы

Откройте в браузере или выполните в терминале:

```bash
curl http://localhost:3000/health
```

Должен вернуться ответ:
```json
{"status":"ok","service":"electronics-store-api"}
```

## Тестирование API

### Получить все товары
```bash
curl http://localhost:3000/api/products
```

### Создать заказ
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"clientName\":\"Иван Иванов\",\"clientEmail\":\"ivan@example.com\",\"items\":[{\"productId\":1,\"quantity\":1}]}"
```

### Добавить товар
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Новый товар\",\"price\":5000,\"category\":\"Аксессуары\",\"inStock\":10}"
```


