import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';

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
    const watchId = useRef(null); // Используем useRef для хранения watchId

    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        if (navigator.geolocation) {
            // Запускаем отслеживание позиции и сохраняем watchId
            watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                enableHighAccuracy: true,
                maximumAge: 0, // Не использовать кэшированные данные
                timeout: 5000 // Время ожидания в миллисекундах
            });
        } else {
            console.error('Geolocation is not supported by this browser.');
        }

        return () => {
            // Очищаем наблюдение при размонтировании компонента
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    return (
        <MapContainer
            center={[60.7076, 28.7528]} // начальная позиция
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
    );
};

export default DriverMapInOnline;
