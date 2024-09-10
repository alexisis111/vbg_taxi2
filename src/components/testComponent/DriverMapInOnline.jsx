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
    const [lastLocation, setLastLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const [activeOrders, setActiveOrders] = useState([]); // Инициализация как пустой массив
    const watchId = useRef(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const wsClient = useRef(null); // WebSocket клиент

    // Получение активных заказов при монтировании компонента
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await axios.get('https://18ce-176-59-23-24.ngrok-free.app/active-orders');
                const orders = Array.isArray(response.data) ? response.data : []; // Проверка, что данные - массив
console.log(orders)
                // Сохраняем только заказы, которые не отменены
                setActiveOrders(prevOrders => {
                    const updatedOrders = Array.isArray(prevOrders) ? prevOrders : [];
                    const activeOrders = orders.filter(order => order.status !== 'отменен');
                    return activeOrders;
                });
            } catch (error) {
                console.error('Error fetching active orders:', error);
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
                console.log('Received Blob, converting to text...');
                event.data.text().then(text => {
                    console.log('Blob converted to text:', text);
                    try {
                        const newOrder = JSON.parse(text);
                        console.log('Parsed JSON:', newOrder);

                        // Обновляем состояние активных заказов
                        setActiveOrders(prevOrders => {
                            const updatedOrders = Array.isArray(prevOrders) ? prevOrders : [];
                            const existingOrderIndex = updatedOrders.findIndex(order => order.orderId === newOrder.orderId);

                            // Если заказ уже существует, обновляем его данные
                            if (existingOrderIndex === -1) {
                                return [...updatedOrders, newOrder];
                            } else {
                                updatedOrders[existingOrderIndex] = newOrder;
                                return updatedOrders;
                            }
                        });
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                }).catch(error => {
                    console.error('Error converting Blob to text:', error);
                });
            } else {
                try {
                    console.log('Received non-Blob data:', event.data);
                    const newOrder = JSON.parse(event.data);

                    // Обновляем состояние активных заказов
                    setActiveOrders(prevOrders => {
                        const updatedOrders = Array.isArray(prevOrders) ? prevOrders : [];
                        const existingOrderIndex = updatedOrders.findIndex(order => order.orderId === newOrder.orderId);

                        // Если заказ уже существует, обновляем его данные
                        if (existingOrderIndex === -1) {
                            return [...updatedOrders, newOrder];
                        } else {
                            updatedOrders[existingOrderIndex] = newOrder;
                            return updatedOrders;
                        }
                    });
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
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

    // Работа с геолокацией
    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            setLastLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        const startGeolocationWatch = () => {
            if (navigator.geolocation && !watchId.current) {
                watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                });
            }
        };

        const stopGeolocationWatch = () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startGeolocationWatch();
            } else {
                stopGeolocationWatch();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const hasPermission = localStorage.getItem('geolocation_permission');

        if (!hasPermission) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'granted') {
                    localStorage.setItem('geolocation_permission', 'granted');
                    setPermissionGranted(true);
                    startGeolocationWatch();
                } else if (result.state === 'prompt') {
                    if (!permissionGranted) {
                        startGeolocationWatch();
                    }
                }
            }).catch(() => {
                startGeolocationWatch();
            });
        } else {
            setPermissionGranted(true);
            startGeolocationWatch();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopGeolocationWatch();
        };
    }, [permissionGranted]);

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
                        <li key={order.orderId} className="order-item p-2 bg-blue-100 border border-blue-300 rounded mb-2">
                            <strong>Заказ №{order.orderId}</strong><br />
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
