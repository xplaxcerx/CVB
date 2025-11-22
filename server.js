const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        inStock INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientName TEXT NOT NULL,
        clientEmail TEXT NOT NULL,
        clientPhone TEXT,
        totalAmount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (orderId) REFERENCES orders(id),
        FOREIGN KEY (productId) REFERENCES products(id)
    )`);

    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
        if (row.count === 0) {
            const initialProducts = [
                { name: 'Смартфон Samsung Galaxy', description: 'Смартфон с экраном 6.5"', price: 25000, category: 'Смартфоны', inStock: 15 },
                { name: 'Ноутбук ASUS', description: 'Ноутбук 15.6" Intel Core i5', price: 45000, category: 'Ноутбуки', inStock: 8 },
                { name: 'Наушники Sony', description: 'Беспроводные наушники', price: 5000, category: 'Аксессуары', inStock: 25 },
                { name: 'Планшет iPad', description: 'Планшет 10.2"', price: 30000, category: 'Планшеты', inStock: 12 },
                { name: 'Мышь Logitech', description: 'Беспроводная мышь', price: 1500, category: 'Аксессуары', inStock: 30 }
            ];

            const stmt = db.prepare('INSERT INTO products (name, description, price, category, inStock) VALUES (?, ?, ?, ?, ?)');
            initialProducts.forEach(product => {
                stmt.run(product.name, product.description, product.price, product.category, product.inStock);
            });
            stmt.finalize();
        }
    });
});

app.get('/api/products', (req, res) => {
    const category = req.query.category;
    let query = 'SELECT * FROM products';
    const params = [];

    if (category) {
        query += ' WHERE category = ?';
        params.push(category);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/products/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(row);
    });
});

app.get('/api/orders', (req, res) => {
    db.all(`SELECT o.*, 
            GROUP_CONCAT(oi.productId || ':' || oi.quantity || ':' || oi.price) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.orderId
            GROUP BY o.id
            ORDER BY o.createdAt DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/orders/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM orders WHERE id = ?', [id], (err, order) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!order) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        db.all('SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?', [id], (err, items) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ ...order, items });
        });
    });
});

app.post('/api/orders', (req, res) => {
    const { clientName, clientEmail, clientPhone, items } = req.body;

    if (!clientName || !clientEmail || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Необходимо указать имя, email и товары' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const productChecks = [];
        let checkedCount = 0;
        let totalAmount = 0;
        let hasError = false;

        const checkNext = (index) => {
            if (index >= items.length) {
                if (hasError) return;
                
                db.run(`INSERT INTO orders (clientName, clientEmail, clientPhone, totalAmount, status) 
                        VALUES (?, ?, ?, ?, 'pending')`, 
                        [clientName, clientEmail, clientPhone || '', totalAmount], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    const orderId = this.lastID;
                    const stmt = db.prepare('INSERT INTO order_items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)');
                    let itemsInserted = 0;
                    
                    productChecks.forEach(item => {
                        stmt.run(orderId, item.productId, item.quantity, item.price);
                        db.run('UPDATE products SET inStock = inStock - ? WHERE id = ?', [item.quantity, item.productId]);
                        itemsInserted++;
                    });
                    
                    stmt.finalize(() => {
                        db.run('COMMIT', (err) => {
                            if (err) {
                                return res.status(500).json({ error: err.message });
                            }
                            res.status(201).json({
                                success: true,
                                orderId: orderId,
                                totalAmount: totalAmount,
                                message: 'Заказ успешно создан'
                            });
                        });
                    });
                });
                return;
            }

            const item = items[index];
            db.get('SELECT price, inStock FROM products WHERE id = ?', [item.productId], (err, product) => {
                if (hasError) return;

                if (err) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }

                if (!product) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(400).json({ error: `Товар с id ${item.productId} не найден` });
                }

                if (product.inStock < item.quantity) {
                    hasError = true;
                    db.run('ROLLBACK');
                    return res.status(400).json({ error: `Недостаточно товара с id ${item.productId} на складе. Доступно: ${product.inStock}, запрошено: ${item.quantity}` });
                }

                totalAmount += product.price * item.quantity;
                productChecks.push({ productId: item.productId, quantity: item.quantity, price: product.price });
                
                checkNext(index + 1);
            });
        };

        checkNext(0);
    });
});

app.post('/api/products', (req, res) => {
    const { name, description, price, category, inStock } = req.body;

    if (!name || !price) {
        return res.status(400).json({ error: 'Необходимо указать название и цену товара' });
    }

    db.run(`INSERT INTO products (name, description, price, category, inStock) 
            VALUES (?, ?, ?, ?, ?)`, 
            [name, description || '', price, category || 'Прочее', inStock || 0], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            success: true,
            productId: this.lastID,
            message: 'Товар успешно добавлен'
        });
    });
});

app.get('/api/categories', (req, res) => {
    db.all('SELECT DISTINCT category FROM products WHERE category IS NOT NULL', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows.map(row => row.category));
    });
});

app.get('/', (req, res) => {
    res.json({
        service: 'Electronics Store API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            'GET /health': 'Проверка работоспособности',
            'GET /api/products': 'Получить все товары',
            'GET /api/products/:id': 'Получить товар по ID',
            'GET /api/products?category=...': 'Получить товары по категории',
            'GET /api/categories': 'Получить все категории',
            'GET /api/orders': 'Получить все заказы',
            'GET /api/orders/:id': 'Получить заказ по ID',
            'POST /api/products': 'Добавить товар',
            'POST /api/orders': 'Создать заказ'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'electronics-store-api' });
});

app.listen(PORT, () => {
    console.log(`Веб-API запущен на порту ${PORT}`);
    console.log(`Доступные endpoints:`);
    console.log(`  GET  /api/products - получить все товары`);
    console.log(`  GET  /api/products/:id - получить товар по ID`);
    console.log(`  GET  /api/orders - получить все заказы`);
    console.log(`  GET  /api/orders/:id - получить заказ по ID`);
    console.log(`  GET  /api/categories - получить все категории`);
    console.log(`  POST /api/products - добавить товар`);
    console.log(`  POST /api/orders - создать заказ`);
});

