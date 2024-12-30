import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import polyline from 'polyline';

const API_KEY = '5b3ce3597851110001cf6248143b17765c594c79a4a1a61dc30df2cb';

// Компонент CenteredMarker
const CenteredMarker = React.memo(({ position, bounds, isSelectedOrder }) => {
    const map = useMap();

    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (position && !isSelectedOrder) {
            map.setView(position, 13, { animate: true }); // Центрируем на текущей геолокации
        }
    }, [position, bounds, map, isSelectedOrder]);

    return position ? <Marker position={position} /> : null;
});

// Компонент второго маркера
const SecondaryMarker = React.memo(({ position }) => {
    return position ? <Marker position={position} /> : null;
});

// Компонент списка заказов
const OrderList = ({ orders, onSelectOrder, selectedOrderId }) => {
    if (!orders.length) return <p>Нет активных заказов</p>;

    return (
        <ul className="order-list">
            {orders.map(order => (
                <li
                    key={order.id}
                    className={`order-item p-2 border rounded mb-2 ${selectedOrderId === order.id ? 'border-green-500' : 'border-blue-300'}`}
                    onClick={() => onSelectOrder(order)} // Выбор заказа
                >
                    <strong>Заказ №{order.id}</strong><br />
                    <strong>Адрес отправления:</strong> {order.pickup}<br />
                    <strong>Адрес назначения:</strong> {order.dropoff}<br />
                    <strong>Координаты назначения:</strong> {order.dropoffLat}, {order.dropoffLng}<br />
                    <strong>Тариф:</strong> {order.tariff}<br />
                    <strong>Расстояние:</strong> {order.distance} км<br />
                    <strong>Стоимость:</strong> {order.price} ₽<br />
                    {/* Кнопка открытия маршрута */}
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${order.pickupLat},${order.pickupLng}&destination=${order.dropoffLat},${order.dropoffLng}`}
                        target="_blank"
                        className="mt-2 text-blue-500"
                    >
                        Открыть маршрут на карте
                    </a>
                </li>
            ))}
        </ul>
    );
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [secondaryLocation, setSecondaryLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const [activeOrders, setActiveOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const { tg, user, userId } = useTelegram();

    useEffect(() => {
        const throttledPositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

            console.log('Отправка данных на сервер:', {
                user_id: userId,
                name: user || 'Неизвестный',
                location: `${latitude},${longitude}`,
                status: isOnline ? 'online' : 'offline'
            });
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
    }, [userId, user?.user, isOnline]);

    const toggleDriverStatus = async () => {
        const newStatus = isOnline ? 'offline' : 'online';

        try {
            const response = await axios.put('https://13c6-185-108-19-43.ngrok-free.app/status', {
                user_id: userId,
                status: newStatus
            });

            if (response.status === 200) {
                setIsOnline(!isOnline);
                if (newStatus === 'offline') {
                    setActiveOrders([]);
                    setSelectedOrder(null); // Сброс выбранного заказа
                    setRouteCoords([]); // Сброс маршрута
                    setSecondaryLocation(null); // Сброс второго маркера
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
            const response = await axios.get('https://13c6-185-108-19-43.ngrok-free.app/active-orders', {
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (response.status === 200 && Array.isArray(response.data)) {
                const orders = response.data
                    .filter(order => order.canceled_at === null)
                    .map(order => ({
                        ...order,
                        dropoffLat: order.dropoff_lat || 'Не указано',
                        dropoffLng: order.dropoff_lng || 'Не указано'
                    }));
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

    const getRoute = async (pickupCoords, dropoffCoords) => {
        try {
            const response = await axios.post(
                'https://api.openrouteservice.org/v2/directions/driving-car',
                {
                    coordinates: [pickupCoords, dropoffCoords].map(coord => [coord[1], coord[0]]),
                },
                {
                    headers: {
                        'Authorization': API_KEY, // Укажите ваш API-ключ
                    }
                }
            );

            if (response.data.routes && response.data.routes[0]) {
                const route = response.data.routes[0].geometry;
                const decodedRoute = polyline.decode(route);
                setRouteCoords(decodedRoute);
            }
        } catch (error) {
            setErrorMessage('Не удалось построить маршрут. Попробуйте позже.');
            console.error('Ошибка при получении маршрута:', error);
        }
    };

    const handleSelectOrder = (order) => {
        if (selectedOrder?.id === order.id) {
            setSelectedOrder(null);
            setSecondaryLocation(null);
            setRouteCoords([]);
        } else {
            setSelectedOrder(order);
            const pickupCoords = [userLocation[0], userLocation[1]];
            const dropoffCoords = [order.dropoffLat, order.dropoffLng];
            setSecondaryLocation(dropoffCoords);
            getRoute(pickupCoords, dropoffCoords);
        }
    };

    useEffect(() => {
        const checkDriverStatus = async () => {
            try {
                const response = await axios.get(`https://13c6-185-108-19-43.ngrok-free.app/driver-status/${userId}`, {
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true"
                    }
                });

                if (response.status === 200 && response.data?.status) {
                    setIsOnline(response.data.status === 'online');
                } else {
                    throw new Error('Некорректный ответ от сервера.');
                }
            } catch (error) {
                setErrorMessage('Не удалось проверить статус водителя. Попробуйте позже.');
                console.error('Ошибка при проверке статуса водителя:', error);
            }
        };

        checkDriverStatus();
    }, [userId]);

    useEffect(() => {
        if (isOnline) {
            fetchActiveOrders();
            const intervalId = setInterval(fetchActiveOrders, 15000);
            return () => clearInterval(intervalId);
        }
    }, [isOnline]);

    const mapBounds = selectedOrder && routeCoords.length > 0
        ? routeCoords.map(([lat, lng]) => [lat, lng])
        : null;

    return (
        <div className="map-container p-4">
            {errorMessage && <div className="error-message text-red-500 p-2">{errorMessage}</div>}

            <MapContainer center={[60.7076, 28.7528]} zoom={13} className="w-full h-[450px]">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {userLocation && <CenteredMarker position={userLocation} bounds={mapBounds} isSelectedOrder={!!selectedOrder} />}
                {secondaryLocation && <SecondaryMarker position={secondaryLocation} />}
                {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
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
                            <OrderList orders={activeOrders} onSelectOrder={handleSelectOrder} selectedOrderId={selectedOrder?.id} />
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
