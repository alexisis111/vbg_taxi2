const express = require('express');
const WebSocket = require('ws');
const http = require('http');

// Создаем сервер с использованием Express
const app = express();
const server = http.createServer(app);

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Массив для хранения активных подключений
let clients = [];

// Обработчик подключения клиента
wss.on('connection', (ws) => {
    console.log('Новое WebSocket соединение');

    // Добавляем клиента в список
    clients.push(ws);

    // Обработчик получения сообщений от клиента
    ws.on('message', (message) => {
        console.log('Получено сообщение:', message);
        const data = JSON.parse(message);

        // Обработка различных типов сообщений
        if (data.action === 'subscribe') {
            // Подписка на обновления для конкретного пользователя
            console.log(`Пользователь с ID ${data.user_id} подписан на обновления`);
        } else if (data.action === 'update_location') {
            // Обновление геолокации пользователя
            console.log(`Получена геолокация для пользователя ${data.user_id}: ${data.location}`);
            // Отправка обновлений другим пользователям
            broadcast({
                type: 'location',
                user_id: data.user_id,
                location: data.location,
            });
        }
    });

    // Обработчик закрытия соединения
    ws.on('close', () => {
        console.log('WebSocket соединение закрыто');
        // Удаляем клиента из списка
        clients = clients.filter(client => client !== ws);
    });

    // Обработчик ошибок
    ws.on('error', (error) => {
        console.error('Ошибка WebSocket:', error);
    });
});

// Функция для отправки сообщений всем подключенным клиентам
const broadcast = (data) => {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};


// Запуск сервера на порту 3001
server.listen(3001, () => {
    console.log('Сервер WebSocket запущен на порту 3001');
});
