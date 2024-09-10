import { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from "axios";

const CenteredMarker = ({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return <Marker position={position} />;
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const [activeOrders, setActiveOrders] = useState([]); // Инициализация как пустой массив
    const wsClient = useRef(null); // WebSocket клиент

    // Получение активных заказов при монтировании компонента
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await axios.get('https://18ce-176-59-23-24.ngrok-free.app/active-orders');
                const orders = response.data; // Берём данные из ответа
                console.log("Полученные заказы:", orders);

                // Проверяем и фильтруем только заказы, у которых canceled_at === null
                const activeOrders = orders.filter(order => order.canceled_at === null);
                setActiveOrders(activeOrders);

            } catch (error) {
                console.error('Ошибка при получении активных заказов:', error);
                setActiveOrders([]); // В случае ошибки сохраняем пустой массив
            }
        };

        // Первый вызов сразу после монтирования компонента
        fetchActiveOrders();

        // Периодически обновляем активные заказы (каждые 30 секунд)
        const intervalId = setInterval(fetchActiveOrders, 30000);

        return () => clearInterval(intervalId); // Очищаем интервал при размонтировании компонента
    }, []);

    // Подключение к WebSocket
    useEffect(() => {
        wsClient.current = new WebSocket('ws://localhost:8080');

        wsClient.current.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        wsClient.current.onmessage = (event) => {
            console.log('Message received from WebSocket server:', event.data);

            if (event.data instanceof Blob) {
                event.data.text().then(text => {
                    try {
                        const newOrder = JSON.parse(text);
                        updateOrders(newOrder);
                    } catch (error) {
                        console.error('Ошибка при обработке сообщения WebSocket:', error);
                    }
                });
            } else {
                try {
                    const newOrder = JSON.parse(event.data);
                    updateOrders(newOrder);
                } catch (error) {
                    console.error('Ошибка при обработке сообщения WebSocket:', error);
                }
            }
        };

        wsClient.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsClient.current.onclose = () => {
            console.log('WebSocket connection closed');
        };

        return () => {
            if (wsClient.current) {
                wsClient.current.close();
            }
        };
    }, []);

    const updateOrders = (newOrder) => {
        setActiveOrders(prevOrders => {
            const updatedOrders = Array.isArray(prevOrders) ? prevOrders : [];
            const existingOrderIndex = updatedOrders.findIndex(order => order.id === newOrder.id);

            if (existingOrderIndex === -1) {
                return [...updatedOrders, newOrder];
            } else {
                updatedOrders[existingOrderIndex] = newOrder;
                return updatedOrders;
            }
        });
    };

    // Работа с геолокацией
    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        };

        const handleError = (error) => {
            console.error('Ошибка при получении геолокации:', error);
        };

        const startGeolocationWatch = () => {
            if (navigator.geolocation) {
                navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                });
            }
        };

        startGeolocationWatch();
    }, []);

    return (
        <div className="map-container">
            <MapContainer
                center={[60.7076, 28.7528]}
                zoom={13}
                className="w-full h-[450px]"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {userLocation && (
                    <CenteredMarker position={userLocation} />
                )}
            </MapContainer>

            <div className="location-status mt-2 p-2 bg-gray-100 border border-gray-300 rounded">
                {locationChange || 'Геолокация не обновлялась'}
            </div>

            <h3 className="font-bold mt-4">Активные заказы</h3>
            <ul className="order-list">
                {Array.isArray(activeOrders) && activeOrders.length > 0 ? (
                    activeOrders.map(order => (
                        <li key={order.id} className="order-item p-2 bg-blue-100 border border-blue-300 rounded mb-2">
                            <strong>Заказ №{order.id}</strong><br />
                            <strong>Адрес отправления:</strong> {order.pickup}<br />
                            <strong>Адрес назначения:</strong> {order.dropoff}<br />
                            <strong>Тариф:</strong> {order.tariff}<br />
                            <strong>Расстояние:</strong> {order.distance} км<br />
                            <strong>Стоимость:</strong> {order.price} ₽
                        </li>
                    ))
                ) : (
                    <li>Нет активных заказов</li>
                )}
            </ul>
        </div>
    );
};

export default DriverMapInOnline;
