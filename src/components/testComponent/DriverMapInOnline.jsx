import React, { useState, useEffect, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import axios from 'axios';
import debounce from 'lodash.debounce';
import { useTelegram } from '../../hooks/useTelegram'; // импорт хука для работы с Telegram

// Компонент CenteredMarker, мемоизирован для предотвращения лишних рендеров
const CenteredMarker = React.memo(({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return <Marker position={position} />;
});

// Компонент списка заказов
const OrderList = ({ orders }) => {
    if (!orders.length) return <p>Нет активных заказов</p>;

    return (
        <ul className="order-list">
            {orders.map(order => (
                <li key={order.id} className="order-item p-2 border border-blue-300 rounded mb-2">
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
    const [loading, setLoading] = useState(true); // Индикатор загрузки
    const [errorMessage, setErrorMessage] = useState(''); // Сообщение об ошибке
    const [isOnline, setIsOnline] = useState(false); // Статус водителя (онлайн/оффлайн)
    const { tg, user, userId } = useTelegram(); // используем хук для получения tg объекта

    // Функция для получения активных заказов
    const fetchActiveOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://34cb-185-108-19-43.ngrok-free.app/active-orders', {
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "true"
                }
            });

            if (response.status === 200 && response.data) {
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
    }, []);

    // Вызов функции для получения заказов каждые 15 секунд
    useEffect(() => {
        fetchActiveOrders();
        const intervalId = setInterval(fetchActiveOrders, 15000);
        return () => clearInterval(intervalId);
    }, [fetchActiveOrders]);

    // Отправка данных водителя на сервер при входе на страницу
    useEffect(() => {
        const handlePositionUpdate = debounce((position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

            // Отправка данных о водителе на сервер при загрузке страницы
            axios.post('https://34cb-185-108-19-43.ngrok-free.app/driver', {
                user_id: userId,
                name: user?.username || 'Неизвестный',
                tg_username: user?.username,
                location: `${latitude},${longitude}`
            })
                .then(response => {
                    console.log('Водитель успешно добавлен:', response.data.message);
                })
                .catch(error => {
                    console.error('Ошибка при добавлении водителя:', error);
                });
        }, 1000);

        const handleError = (error) => {
            setErrorMessage('Не удалось получить вашу геолокацию. Пожалуйста, проверьте настройки.');
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
    }, [user, userId]);

    // Обработчик для изменения статуса водителя (онлайн/оффлайн)
    const toggleDriverStatus = () => {
        const newStatus = isOnline ? 'offline' : 'online';

        // Отправка нового статуса водителя на сервер с использованием fetch
        fetch('https://34cb-185-108-19-43.ngrok-free.app/status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true' // Можно добавить этот заголовок для ngrok
            },
            body: JSON.stringify({
                user_id: userId,
                status: newStatus
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка сети: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Статус водителя успешно обновлен:', data.message);
                setIsOnline(!isOnline);
            })
            .catch(error => {
                console.error('Ошибка при обновлении статуса водителя:', error);
            });
    };



    return (
        <div className="map-container">
            {/* Сообщение об ошибке */}
            {errorMessage && <div className="error-message text-red-500 p-2">{errorMessage}</div>}

            {/* Карта */}
            <MapContainer
                center={[60.7076, 28.7528]}
                zoom={13}
                className="w-full h-[450px]"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {userLocation && <CenteredMarker position={userLocation} />}
            </MapContainer>

            {/* Статус геолокации */}
            <div className="location-status mt-2 p-2 border border-gray-300 rounded">
                {locationChange || 'Геолокация не обновлялась'}
            </div>

            {/* Кнопка для изменения статуса водителя */}
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
                {isOnline ? 'Я офлайн' : 'Я на линии'}
            </button>

            {/* Индикатор загрузки */}
            {loading ? (
                <p className="loading-message mt-4 text-blue-500">Загрузка активных заказов...</p>
            ) : (
                <>
                    <h3 className="font-bold mt-4">Активные заказы</h3>
                    <OrderList orders={activeOrders} />
                </>
            )}

            {/* Отображение ID пользователя Telegram */}
            <div className="telegram-info mt-4">
                <strong>Ваш ID в Telegram: {userId}</strong>
            </div>
        </div>
    );
};

export default DriverMapInOnline;
