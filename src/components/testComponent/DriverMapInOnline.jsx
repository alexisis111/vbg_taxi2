import React, { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useTelegram } from '../../hooks/useTelegram';
import 'leaflet-routing-machine';

// Компонент для отображения маркера на карте
const CenteredMarker = React.memo(({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return <Marker position={position} />;
});

// Компонент для прокладывания маршрута
const Route = ({ start, end }) => {
    const map = useMap();

    useEffect(() => {
        if (start && end) {
            const routeControl = L.Routing.control({
                waypoints: [
                    L.latLng(start.lat, start.lng),
                    L.latLng(end.lat, end.lng)
                ],
                routeWhileDragging: true
            }).addTo(map);

            return () => {
                map.removeControl(routeControl);
            };
        }
    }, [start, end, map]);

    return null;
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const [activeOrders, setActiveOrders] = useState([]);
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

    // Обработчик для изменения статуса водителя
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
                    setActiveOrders([]); // Сбрасываем заказы, если водитель уходит в офлайн
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
        if (!isOnline) return; // Не выполняем запрос, если водитель не в сети

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
            const intervalId = setInterval(fetchActiveOrders, 15000); // Обновление каждые 15 секунд
            return () => clearInterval(intervalId); // Очистка интервала
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
                {activeOrders.map(order => (
                    <React.Fragment key={order.id}>
                        <Marker position={[order.pickupLat, order.pickupLng]} />
                        <Marker position={[order.dropoffLat, order.dropoffLng]} />
                        <Route
                            start={{ lat: order.pickupLat, lng: order.pickupLng }}
                            end={{ lat: order.dropoffLat, lng: order.dropoffLng }}
                        />
                    </React.Fragment>
                ))}
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
                            <OrderList orders={activeOrders} />
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
