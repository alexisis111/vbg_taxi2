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
    const [locationChanged, setLocationChanged] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const watchId = useRef(null);

    useEffect(() => {
        const handlePositionUpdate = (position) => {
            const { latitude, longitude } = position.coords;
            if (userLocation) {
                const prevLat = userLocation[0];
                const prevLng = userLocation[1];
                if (latitude !== prevLat || longitude !== prevLng) {
                    setLocationChanged(`Геолокация изменилась на ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
                }
            }
            setUserLocation([latitude, longitude]);
        };

        const handleError = (error) => {
            console.error('Error getting location:', error);
        };

        const requestPermission = () => {
            if (navigator.geolocation) {
                if (!hasPermission) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setHasPermission(true);
                            handlePositionUpdate(position);
                            watchId.current = navigator.geolocation.watchPosition(handlePositionUpdate, handleError, {
                                enableHighAccuracy: true,
                                maximumAge: 0,
                                timeout: 5000
                            });
                        },
                        handleError,
                        {
                            enableHighAccuracy: true,
                            maximumAge: 0,
                            timeout: 5000
                        }
                    );
                }
            } else {
                console.error('Geolocation is not supported by this browser.');
            }
        };

        requestPermission();

        return () => {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [hasPermission, userLocation]);

    return (
        <>
            <MapContainer
                center={[60.7076, 28.7528]}
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

            <div className="py-4 text-center">
                {locationChanged ? locationChanged : 'Ожидание изменения геолокации...'}
            </div>
        </>
    );
};

export default DriverMapInOnline;
