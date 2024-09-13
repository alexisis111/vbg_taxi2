import { useState, useEffect } from 'react';
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
    const [isOnline, setIsOnline] = useState(false); // Новое состояние для отслеживания онлайн/офлайн
    const { tg, user, userId, queryId } = useTelegram();

    // Функция отправки данных на сервер
    const updateDriverStatus = async (status) => {
        const data = {
            userId,
            username: user?.username || 'unknown',
            status,
            location: userLocation,
            timestamp: new Date().toISOString(),
        };

        try {
            await axios.post('https://975e-185-108-19-43.ngrok-free.app/driver-status', data);
            logDriverAction(data); // Логируем действие водителя
        } catch (error) {
            console.error('Ошибка при обновлении статуса водителя:', error);
        }
    };

    // Функция логирования действий водителя
    const logDriverAction = (data) => {
        const logMessage = `Driver ${data.username} (${data.userId}) is now ${data.status} at ${data.timestamp}, location: ${data.location}`;
        // Отправляем лог на сервер или сохраняем в локальный лог-файл
        console.log(logMessage);
    };

    // Обработчик нажатия кнопки "Онлайн/Офлайн"
    const handleToggleStatus = () => {
        const newStatus = !isOnline ? 'online' : 'offline';
        setIsOnline(!isOnline);
        updateDriverStatus(newStatus);
    };

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

            <div className="location-status mt-2 p-2 border border-gray-300 rounded">
                {locationChange || 'Геолокация не обновлялась'}
            </div>

            {/* Кнопка для переключения статуса онлайн/офлайн */}
            <button
                className={`mt-4 p-2 ${isOnline ? 'bg-red-500' : 'bg-green-500'} text-white rounded`}
                onClick={handleToggleStatus}
            >
                {isOnline ? 'Стать офлайн' : 'Стать онлайн'}
            </button>
        </div>
    );
};

export default DriverMapInOnline;
