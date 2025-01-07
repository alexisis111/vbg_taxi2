import { useEffect, useRef } from 'react';
import L from 'leaflet';

export const useMapHandler = (pickupCoords, dropoffCoords, routeCoords) => {
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current && pickupCoords && dropoffCoords) {
            const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
            if (routeCoords) {
                bounds.extend(routeCoords.map(coord => [coord[0], coord[1]]));
            }
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [pickupCoords, dropoffCoords, routeCoords]);

    return mapRef;
};
