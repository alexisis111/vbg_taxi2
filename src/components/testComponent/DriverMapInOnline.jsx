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


    // Запрос активных заказов
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await axios.get('https://1dd5-185-108-19-43.ngrok-free.app/active-orders', {
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
        const intervalId = setInterval(fetchActiveOrders, 15000);
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
