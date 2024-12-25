import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';

// Компонент CenteredMarker
const CenteredMarker = React.memo(({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return <Marker position={position} />;
});

// Компонент для отображения маршрута
const Route = ({ start, end }) => {
    const map = useMap();

    useEffect(() => {
        if (!start || !end) return;

        const routingControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
        }).addTo(map);

        return () => {
            map.removeControl(routingControl);
        };
    }, [start, end, map]);

    return null;
};

// Компонент списка заказов
const OrderList = ({ orders, selectedOrder, onSelectOrder }) => {
    if (!orders.length) return <p>Нет активных заказов</p>;

    return (
        <ul className="order-list">
            {orders.map(order => (
                <li
                    key={order.id}
                    className={`order-item p-2 border rounded mb-2 ${selectedOrder?.id === order.id ? 'border-green-500' : 'border-blue-300'}`}
                    onClick={() => onSelectOrder(order)}
                    style={{ cursor: 'pointer' }}
                >
                    <strong>Заказ №{order.id}</strong><br />
                    <strong>Адрес отправления:</strong> {order.pickup}<br />
                    <strong>Адрес назначения:</strong> {order.dropoff}<br />
                    <strong>Тариф:</strong> {order.tariff}<br />
                    <strong>Расстояние:</strong> {order.distance} км<br />
                    <strong>Стоимость:</strong> {order.price} ₽
                </li>
            ))}
        </ul>
    );
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const [activeOrders, setActiveOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const { tg, user, userId } = useTelegram(); // используем хук для получения tg объекта

    // Обновление геолокации
    useEffect(() => {
        const throttledPositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        };

        const handleError = (error) => {
            setErrorMessage('Не удалось получить вашу геолокацию. Проверьте настройки.');
            console.error('Ошибка при получении геолокации:', error);
        };

        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                throttledPositionUpdate,
                handleError,
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    const toggleDriverStatus = async () => {
        const newStatus = isOnline ? 'offline' : 'online';

        try {
            const response = await axios.put('https://a242-185-108-19-43.ngrok-free.app/status', {
                user_id: userId,
                status: newStatus
            });

            if (response.status === 200) {
                setIsOnline(!isOnline);
                if (newStatus === 'offline') {
                    setActiveOrders([]);
                    setSelectedOrder(null); // Сбрасываем выделенный заказ
                }
            } else {
                throw new Error('Ошибка обновления статуса.');
            }
        } catch (error) {
            setErrorMessage('Не удалось обновить статус. Попробуйте позже.');
            console.error('Ошибка при обновлении статуса водителя:', error);
        }
    };

    const fetchActiveOrders = async () => {
        if (!isOnline) return;

        setLoading(true);
        try {
            const response = await axios.get('https://a242-185-108-19-43.ngrok-free.app/active-orders', {
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (response.status === 200 && Array.isArray(response.data)) {
                const orders = response.data.filter(order => order.canceled_at === null);
                setActiveOrders(orders);
            } else {
                throw new Error('Некорректный ответ от сервера.');
            }
        } catch (error) {
            setErrorMessage('Не удалось загрузить активные заказы. Попробуйте позже.');
            console.error('Ошибка при получении активных заказов:', error);
            setActiveOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOnline) {
            fetchActiveOrders();
            const intervalId = setInterval(fetchActiveOrders, 15000);
            return () => clearInterval(intervalId);
        }
    }, [isOnline]);

    return (
        <div className="map-container">
            {errorMessage && <div className="error-message text-red-500 p-2">{errorMessage}</div>}

            <MapContainer center={[60.7076, 28.7528]} zoom={13} className="w-full h-[450px]">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {userLocation && <CenteredMarker position={userLocation} />}
                {selectedOrder && (
                    <Route
                        start={[selectedOrder.pickupLat, selectedOrder.pickupLng]}
                        end={[selectedOrder.dropoffLat, selectedOrder.dropoffLng]}
                    />
                )}
            </MapContainer>

            <div className="location-status mt-2 p-2 border border-gray-300 rounded">
                {locationChange || 'Геолокация не обновлялась'}
            </div>

            <button
                onClick={toggleDriverStatus}
                style={{
                    backgroundColor: isOnline ? 'red' : 'green',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '5px',
                    marginTop: '20px'
                }}
            >
                {isOnline ? 'Уйти с линии' : 'Выйти на линию'}
            </button>

            {isOnline ? (
                <>
                    {loading ? (
                        <p className="loading-message mt-4 text-blue-500">Загрузка активных заказов...</p>
                    ) : (
                        <>
                            <h3 className="font-bold mt-4">Активные заказы</h3>
                            <OrderList
                                orders={activeOrders}
                                selectedOrder={selectedOrder}
                                onSelectOrder={setSelectedOrder}
                            />
                        </>
                    )}
                </>
            ) : (
                <p className="mt-4 text-gray-500">Чтобы получать заказы, выйдите на линию</p>
            )}

            <div className="telegram-info mt-4">
                <strong>Ваш ID в Telegram: {userId}</strong>
            </div>
        </div>
    );
};

export default DriverMapInOnline;
