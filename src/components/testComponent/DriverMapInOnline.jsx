import { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';

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
    const [activeOrders, setActiveOrders] = useState([]);
    const [isOnline, setIsOnline] = useState(false);
    const wsClient = useRef(null);
    const { userId } = useTelegram();

    // Функция для обновления активных заказов
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

    // Подключение к серверу WebSocket
    useEffect(() => {
        wsClient.current = new WebSocket('ws://localhost:8080');

        wsClient.current.onopen = () => {
            console.log('Connected to WebSocket server');
            if (userId) {
                wsClient.current.send(JSON.stringify({ type: 'register', driverId: userId }));
                wsClient.current.send(JSON.stringify({ type: 'getStatus', driverId: userId }));
            } else {
                console.error('User ID is not available');
            }
        };

        wsClient.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'statusUpdate') {
                    setIsOnline(message.status === 'online');
                } else {
                    updateOrders(message);
                }
            } catch (error) {
                console.error('Ошибка при обработке сообщения WebSocket:', error);
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
    }, [userId]);


    // Запрос активных заказов
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await axios.get('https://17a8-185-108-19-43.ngrok-free.app/active-orders', {
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true"
                    }
                });
                if (response.headers['content-type'].includes('application/json')) {
                    const orders = response.data;
                    const activeOrders = orders.filter(order => order.canceled_at === null);
                    setActiveOrders(activeOrders);
                } else {
                    throw new Error("Неверный тип ответа от сервера. Ожидался JSON.");
                }
            } catch (error) {
                console.error('Ошибка при получении активных заказов:', error);
                setActiveOrders([]);
            }
        };

        fetchActiveOrders();
        const intervalId = setInterval(fetchActiveOrders, 3000);
        return () => clearInterval(intervalId);
    }, []);

    // Обновление геолокации
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

    // Функция для переключения статуса онлайн/оффлайн
    const toggleOnlineStatus = () => {
        if (!userId) {
            console.error('User ID is not available');
            return;
        }

        const newStatus = !isOnline ? 'online' : 'offline';
        setIsOnline(!isOnline);

        console.log('Sending status update:', JSON.stringify({
            type: 'updateStatus',
            driverId: userId,
            status: newStatus
        }));

        if (wsClient.current) {
            wsClient.current.send(JSON.stringify({
                type: 'updateStatus',
                driverId: userId,
                status: newStatus
            }));
        } else {
            console.error('WebSocket client is not initialized');
        }
    };

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

            <button
                onClick={toggleOnlineStatus}
                className={`mt-4 p-2 rounded ${isOnline ? 'bg-red-500' : 'bg-green-500'} text-white`}
            >
                {isOnline ? 'Перейти в офлайн' : 'Стать онлайн'}
            </button>
        </div>
    );
};

export default DriverMapInOnline;
