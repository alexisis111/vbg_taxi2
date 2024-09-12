import { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram'; // Предполагаем, что хук в этом файле

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
    const { userId } = useTelegram(); // Получаем userId из хука

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
                console.log('Sending register message:', JSON.stringify({ type: 'register', driverId: userId }));
                wsClient.current.send(JSON.stringify({ type: 'register', driverId: userId }));
            } else {
                console.error('User ID is not available');
            }
        };

        wsClient.current.onmessage = (event) => {
            console.log('Message received from WebSocket server:', event.data);

            if (event.data instanceof Blob) {
                event.data.text().then(text => {
                    console.log('Parsed message from Blob:', text);
                    try {
                        const parsedData = JSON.parse(text);
                        if (parsedData.type === 'statusUpdate') {
                            const { status } = parsedData;
                            setIsOnline(status === 'online');
                        } else {
                            updateOrders(parsedData);
                        }
                    } catch (error) {
                        console.error('Ошибка при обработке сообщения WebSocket (Blob):', error);
                    }
                });
            } else {
                console.log('Parsed message:', event.data);
                try {
                    const parsedData = JSON.parse(event.data);
                    if (parsedData.type === 'statusUpdate') {
                        const { status } = parsedData;
                        setIsOnline(status === 'online');
                    } else {
                        updateOrders(parsedData);
                    }
                } catch (error) {
                    console.error('Ошибка при обработке сообщения WebSocket:', error);
                }
            }
        };

        wsClient.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsClient.current.onclose = (event) => {
            console.log('WebSocket connection closed:', event.reason);
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
            setLocationChange(`Обновлено: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        };

        const handleError = (error) => {
            console.error('Ошибка геолокации:', error);
        };

        navigator.geolocation.watchPosition(handlePositionUpdate, handleError);

        return () => {
            navigator.geolocation.clearWatch();
        };
    }, []);

    return (
        <div>
            <div>Location: {locationChange}</div>
            <MapContainer center={userLocation || [51.505, -0.09]} zoom={13} style={{ height: "400px", width: "100%" }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <CenteredMarker position={userLocation} />
                {/* Отобразите активные заказы на карте */}
                {activeOrders.map(order => (
                    <Marker key={order.id} position={[order.latitude, order.longitude]} />
                ))}
            </MapContainer>
            <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
        </div>
    );
};

export default DriverMapInOnline;
