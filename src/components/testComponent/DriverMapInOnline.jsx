import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
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
    const [order, setOrder] = useState(null); // Состояние для хранения информации о заказе
    const watchId = useRef(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const wsClient = useRef(null); // WebSocket клиент
    const [activeOrders, setActiveOrders] = useState([]); // Для хранения активных заказов
//проверка активных заказов
    useEffect(() => {
        const fetchActiveOrders = async () => {
            try {
                const response = await axios.get('https://aacd-176-59-12-8.ngrok-free.app/active-orders');
                setActiveOrders(response.data);
            } catch (error) {
                console.error('Error fetching active orders:', error);
            }
        };

        // Периодически обновляем активные заказы (каждые 30 секунд)
        const intervalId = setInterval(fetchActiveOrders, 30000);

        // Первый вызов сразу после монтирования компонента
        fetchActiveOrders();

        return () => clearInterval(intervalId); // Очищаем интервал при размонтировании компонента
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            // Если нужно обновлять состояние, даже если нет изменений
            if (userLocation) {
                setUserLocation(prev => [...prev]);
            }
        }, 60000); // Обновляем каждую минуту

        return () => clearInterval(intervalId);
    }, [userLocation]);

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
                // Обработка случая, если `navigator.permissions.query` не поддерживается
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

    useEffect(() => {
        wsClient.current = new WebSocket('ws://localhost:8080');

        wsClient.current.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        wsClient.current.onmessage = (event) => {
            console.log('Message received from WebSocket server:', event.data);

            // Проверяем, является ли событие Blob-ом
            if (event.data instanceof Blob) {
                console.log('Received Blob, converting to text...');
                event.data.text().then(text => {
                    console.log('Blob converted to text:', text);
                    try {
                        const data = JSON.parse(text);
                        console.log('Parsed JSON:', data);

                        // Нет свойства `order`, просто устанавливаем данные заказа напрямую
                        setOrder(data);
                        console.log('Order set in state:', data);

                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                }).catch(error => {
                    console.error('Error converting Blob to text:', error);
                });
            } else {
                // Обработка случая, когда данные не являются Blob-ом
                try {
                    console.log('Received non-Blob data:', event.data);
                    const data = JSON.parse(event.data);

                    // Устанавливаем данные заказа напрямую
                    setOrder(data);
                    console.log('Order set in state:', data);

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
            {order && (
                <div className="order-info mt-2 p-2 bg-blue-100 border border-blue-300 rounded">
                    <h3 className="font-bold">Новый заказ</h3>
                    <p><strong>Адрес отправления:</strong> {order.pickup}</p>
                    <p><strong>Адрес назначения:</strong> {order.dropoff}</p>
                    <p><strong>Тариф:</strong> {order.tariff}</p>
                    <p><strong>Расстояние:</strong> {order.distance} км</p>
                    <p><strong>Стоимость:</strong> {order.price} ₽</p>
                </div>
            )}
        </div>
    );
};

export default DriverMapInOnline;
