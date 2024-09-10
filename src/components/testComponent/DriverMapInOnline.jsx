import React, { useEffect, useState } from 'react';

function DriverMapInOnline() {
    const [orders, setOrders] = useState([]);

    // Функция для обновления заказов с сервера
    const fetchActiveOrders = async () => {
        try {
            const response = await fetch('https://18ce-176-59-23-24.ngrok-free.app/active-orders');
            // Проверяем, что ответ успешный и имеет корректный формат JSON
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            // Обновляем состояние с активными заказами
            setOrders(data);
        } catch (error) {
            console.error('Error fetching active orders:', error);
        }
    };

    useEffect(() => {
        // При загрузке компонента запрашиваем активные заказы с сервера
        fetchActiveOrders();

        const ws = new WebSocket('ws://localhost:8080');

        ws.onmessage = (event) => {
            const orderData = JSON.parse(event.data);

            // Проверяем, что заказ активный (canceled_at === null)
            if (orderData.canceled_at === null) {
                setOrders((prevOrders) => {
                    // Если заказ уже есть в списке, обновляем его, иначе добавляем новый
                    const existingOrderIndex = prevOrders.findIndex(order => order.id === orderData.id);
                    if (existingOrderIndex !== -1) {
                        const updatedOrders = [...prevOrders];
                        updatedOrders[existingOrderIndex] = orderData;
                        return updatedOrders;
                    } else {
                        return [...prevOrders, orderData];
                    }
                });
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    return (
        <div>
            <h2>Активные заказы</h2>
            <ul>
                {orders.map((order) => (
                    <li key={order.id}>
                        Заказ №{order.id}: {order.pickup} &rarr; {order.dropoff}, цена: {order.price} ₽
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default DriverMapInOnline;
