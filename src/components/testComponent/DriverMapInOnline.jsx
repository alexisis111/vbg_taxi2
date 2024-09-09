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
            setUserLocation([latitude, longitude]);
            setLastLocation([latitude, longitude]);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        const startGeolocationWatch = () => {
            if (navigator.geolocation) {
                if (!watchId.current) {
                    watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 5000
                    });
                }
            } else {
                console.error('Geolocation is not supported by this browser.');
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

        // Проверка и установка разрешения на геолокацию
        const hasPermission = localStorage.getItem('geolocation_permission');
        if (!hasPermission) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                if (result.state === 'granted') {
                    localStorage.setItem('geolocation_permission', 'granted');
                    startGeolocationWatch();
                } else {
                    // Если разрешение не было дано, снова запросим его
                    startGeolocationWatch();
                }
            });
        } else {
            startGeolocationWatch();
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopGeolocationWatch();
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
        </div>
    );
};

export default DriverMapInOnline;
