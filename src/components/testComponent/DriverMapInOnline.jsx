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
    const ws = useRef(null);

    useEffect(() => {
        // Устанавливаем WebSocket соединение один раз
        if (!ws.current) {
            ws.current = new WebSocket('ws://localhost:8080');

            ws.current.onopen = () => {
                console.log('WebSocket connection opened');
            };

            ws.current.onmessage = (message) => {
                try {
                    const data = JSON.parse(message.data);
                    console.log('Received data from server:', data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.current.onclose = () => {
                console.log('WebSocket connection closed');
            };
        }

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const sendLocation = (latitude, longitude) => {
        // Проверяем, изменились ли координаты
        if (
            !lastLocation ||
            lastLocation[0] !== latitude ||
            lastLocation[1] !== longitude
        ) {
            setLastLocation([latitude, longitude]);

            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ latitude, longitude }));
            }
        }
    };

    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation([latitude, longitude]);
            sendLocation(latitude, longitude);
            setLocationChange(`Геолокация изменилась на ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            });
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }, [lastLocation]);

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
