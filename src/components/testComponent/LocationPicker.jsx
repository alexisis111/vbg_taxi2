import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { useMapHandler } from '../../hooks/useMapHandler.js';
import { useLocationHandler } from '../../hooks/useLocationHandler';
import './locationPicker.css';

const API_KEY = '5b3ce3597851110001cf6248143b17765c594c79a4a1a61dc30df2cb';

const LocationPicker = () => {
    const {
        pickup,
        dropoff,
        pickupCoords,
        dropoffCoords,
        routeCoords,
        routeDistance,
        setPickupCoords,
        setDropoffCoords,
        setPickup,
        setDropoff,
        fetchAddress
    } = useLocationHandler(API_KEY);

    const mapRef = useMapHandler(pickupCoords, dropoffCoords, routeCoords);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(({ coords }) => {
                const { latitude, longitude } = coords;
                setPickupCoords([latitude, longitude]);
                fetchAddress([latitude, longitude], setPickup);
            });
        }
    }, [fetchAddress, setPickup, setPickupCoords]);

    return (
        <MapContainer ref={mapRef} center={[60.7076, 28.7528]} zoom={5} className="w-full h-[600px]">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {pickupCoords && <Marker position={pickupCoords} draggable />}
            {dropoffCoords && <Marker position={dropoffCoords} draggable />}
            {routeCoords && <Polyline positions={routeCoords} color="blue" />}
        </MapContainer>
    );
};

export default LocationPicker;
