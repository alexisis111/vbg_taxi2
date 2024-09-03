// NavigationMap.jsx
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import polyline from '@mapbox/polyline';

// Иконка маркера
const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
});

const NavigationMap = () => {
    const [markers, setMarkers] = useState([]);
    const [routeCoords, setRouteCoords] = useState([]);

    const API_KEY = '5b3ce3597851110001cf6248143b17765c594c79a4a1a61dc30df2cb'; // Замените на ваш API ключ

    const addMarker = (e) => {
        const newMarker = e.latlng;
        setMarkers((prevMarkers) => [...prevMarkers, newMarker]);

        if (markers.length >= 1) {
            const coordinates = [...markers, newMarker].map((marker) => [marker.lng, marker.lat]);
            getRoute(coordinates);
        }
    };

    const getRoute = async (coordinates) => {
        try {
            const response = await axios.post(
                'https://api.openrouteservice.org/v2/directions/driving-car',
                {
                    coordinates: coordinates,
                },
                {
                    headers: {
                        'Authorization': API_KEY,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const encodedPolyline = response.data.routes[0].geometry;
                const decodedCoords = polyline.decode(encodedPolyline);

                setRouteCoords(decodedCoords);
            } else {
                console.error('API не вернуло корректные данные:', response.data);
            }
        } catch (error) {
            console.error('Ошибка при получении маршрута:', error);
        }
    };


    const MapClickHandler = () => {
        useMapEvents({
            click: addMarker,
        });
        return null;
    };

    return (
        <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100vh', width: '100%' }}>
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler />
            {markers.map((position, idx) => (
                <Marker key={`marker-${idx}`} position={position} icon={markerIcon} />
            ))}
            {routeCoords.length > 0 && <Polyline positions={routeCoords} color="blue" />}
        </MapContainer>
    );
};

export default NavigationMap;
