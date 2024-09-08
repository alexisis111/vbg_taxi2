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

    return (
        <Marker position={position} />
    );
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                enableHighAccuracy: true,
                maximumAge: 0, // Не использовать кэшированные данные
                timeout: 5000 // Время ожидания в миллисекундах
            });
        } else {
            console.error('Geolocation is not supported by this browser.');
        }

        return () => {
            if (navigator.geolocation) {
                navigator.geolocation.clearWatch(handlePositionUpdate);
            }
        };
    }, []);

    return (
        <MapContainer
            center={[60.7076, 28.7528]} // начальная позиция
            zoom={15}
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
