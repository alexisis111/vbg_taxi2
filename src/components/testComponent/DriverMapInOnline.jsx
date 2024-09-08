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
    const [lastLocation, setLastLocation] = useState(null);
    const [locationChange, setLocationChange] = useState('');
    const watchId = useRef(null);

    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            if (userLocation && lastLocation) {
                const distance = L.latLng(userLocation).distanceTo([latitude, longitude]);
                if (distance > 1) { // Обновление, если перемещение больше 1 метра
                    setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }
            }
            setLastLocation(userLocation);
            setUserLocation([latitude, longitude]);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            });
        } else {
            console.error('Geolocation is not supported by this browser.');
        }

        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [userLocation, lastLocation]);

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
        </div>
    );
};

export default DriverMapInOnline;
