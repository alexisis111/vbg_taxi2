import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import './locationPicker.css'; // оставляем стиль для карты

import marker1 from '/assets/marker-icon-blue.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for missing marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker1,
    iconUrl: marker1,
    shadowUrl: markerShadow,
});

const DriverMapInOnline = () => {
    const [pickupCoords, setPickupCoords] = useState(null);
    const mapRef = useRef(null); // Ссылка на экземпляр карты

    const MapUpdater = () => {
        const map = useMap();
        useEffect(() => {
            if (pickupCoords) {
                map.setView(pickupCoords, 18);
            }
        }, [pickupCoords, map]);
        return null;
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setPickupCoords([latitude, longitude]);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }, []);

    return (
        <div className="leaMaps">
            <MapContainer
                center={[60.7076, 28.7528]} // Начальная позиция карты
                zoom={13}
                className="w-full h-[450px]"
                whenCreated={mapInstance => {
                    mapRef.current = mapInstance;
                }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {pickupCoords && (
                    <Marker
                        position={pickupCoords}
                        icon={new L.Icon({
                            iconUrl: marker1,
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowUrl: markerShadow,
                            shadowSize: [41, 41],
                            shadowAnchor: [12, 41]
                        })}
                    />
                )}
                <MapUpdater />
            </MapContainer>
        </div>
    );
};

export default DriverMapInOnline;
