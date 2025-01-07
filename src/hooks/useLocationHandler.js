import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useLocationHandler = (API_KEY) => {
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [routeCoords, setRouteCoords] = useState(null);
    const [routeDistance, setRouteDistance] = useState(null);

    const fetchAddress = async (coords, setAddress) => {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}&accept-language=ru`);
        const data = await response.json();
        setAddress(data.display_name || '');
    };

    const getRoute = useCallback(async (coordinates) => {
        try {
            const response = await axios.post(
                'https://api.openrouteservice.org/v2/directions/driving-car',
                { coordinates: coordinates.map(coord => [coord[1], coord[0]]) },
                { headers: { 'Authorization': API_KEY } }
            );
            const route = response.data.routes[0];
            setRouteCoords(route.geometry.coordinates);
            setRouteDistance((route.summary.distance / 1000).toFixed(2));
        } catch (error) {
            console.error('Ошибка при получении маршрута:', error);
        }
    }, [API_KEY]);

    useEffect(() => {
        if (pickupCoords && dropoffCoords) {
            getRoute([pickupCoords, dropoffCoords]);
        }
    }, [pickupCoords, dropoffCoords, getRoute]);

    return {
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
    };
};
