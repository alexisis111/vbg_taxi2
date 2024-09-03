import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import polyline from '@mapbox/polyline';

// Импорт иконок
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for missing marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const API_KEY = '5b3ce3597851110001cf6248143b17765c594c79a4a1a61dc30df2cb'; // Замените на ваш API ключ

const LocationPicker = () => {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);
    const [routeCoords, setRouteCoords] = useState(null);
    const [routeDistance, setRouteDistance] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const mapRef = useRef(null); // Ссылка на экземпляр карты

    const handlePickupChange = (e) => {
        setPickup(e.target.value);
    };

    const handleDropoffChange = (e) => {
        setDropoff(e.target.value);
    };

    const MapUpdater = () => {
        const map = useMap();
        useEffect(() => {
            if (pickupCoords && dropoffCoords) {
                const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
                if (routeCoords) {
                    bounds.extend(routeCoords.map(coord => [coord[0], coord[1]]));
                }
                map.fitBounds(bounds, { padding: [50, 50] }); // Устанавливаем границы карты с отступами
            } else if (pickupCoords) {
                map.setView(pickupCoords, 15);
            }
        }, [pickupCoords, dropoffCoords, routeCoords, map]);
        return null;
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]);
                    setPickupCoords([latitude, longitude]);
                    fetchAddress([latitude, longitude], setPickup);
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }, []);

    useEffect(() => {
        if (pickupCoords && dropoffCoords) {
            getRoute([pickupCoords, dropoffCoords]);
        }
    }, [pickupCoords, dropoffCoords]);

    const fetchAddress = async (coords, setAddress) => {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords[0]}&lon=${coords[1]}&accept-language=ru`);
        const data = await response.json();
        const formattedAddress = formatAddress(data.display_name);
        setAddress(formattedAddress);
    };

    const formatAddress = (address) => {
        const parts = address.split(',').map(part => part.trim());
        const [houseNumber, street, settlement] = parts;
        return `${settlement}, ${street} ${houseNumber}`;
    };

    const handleMarkerDrag = (e, setCoords, setAddress) => {
        const coords = [e.target.getLatLng().lat, e.target.getLatLng().lng];
        setCoords(coords);
        fetchAddress(coords, setAddress);
    };

    const getRoute = async (coordinates) => {
        try {
            const response = await axios.post(
                'https://api.openrouteservice.org/v2/directions/driving-car',
                {
                    coordinates: coordinates.map(coord => [coord[1], coord[0]]),
                },
                {
                    headers: {
                        'Authorization': API_KEY,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data && response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                const encodedPolyline = route.geometry;
                const decodedCoords = polyline.decode(encodedPolyline);

                setRouteCoords(decodedCoords);

                const distanceInMeters = route.summary.distance;
                const distanceInKm = (distanceInMeters / 1000).toFixed(2);
                setRouteDistance(distanceInKm);
            } else {
                console.error('API не вернуло корректные данные:', response.data);
            }
        } catch (error) {
            console.error('Ошибка при получении маршрута:', error);
        }
    };

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                const coords = e.latlng;
                setDropoffCoords([coords.lat, coords.lng]);
                fetchAddress([coords.lat, coords.lng], setDropoff);
            }
        });
        return null;
    };

    return (
        <>
            <div className="absolute top-0 left-0 w-full p-4 z-10 bg-white bg-opacity-90 shadow-md">
                <div className="">
                    <input
                        type="text"
                        value={pickup}
                        onChange={handlePickupChange}
                        placeholder="Откуда вас забрать?"
                        className="w-full p-3 mb-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        value={dropoff}
                        onChange={handleDropoffChange}
                        placeholder="Куда отвезти?"
                        className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {routeDistance && (
                    <div className="mt-2 text-black">
                        Расстояние: {routeDistance} км
                    </div>
                )}
            </div>

            <div className="relative w-full h-screen">
                <MapContainer
                    center={[51.505, -0.09]}
                    zoom={13}
                    className="w-full h-full"
                    style={{marginTop: '10rem'}}
                    whenCreated={mapInstance => {
                        mapRef.current = mapInstance;
                    }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    {pickupCoords && (
                        <Marker
                            position={pickupCoords}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => handleMarkerDrag(e, setPickupCoords, setPickup),
                            }}
                        />
                    )}
                    {dropoffCoords && (
                        <Marker
                            position={dropoffCoords}
                            draggable={true}
                            eventHandlers={{
                                dragend: (e) => handleMarkerDrag(e, setDropoffCoords, setDropoff),
                            }}
                        />
                    )}
                    {routeCoords && (
                        <Polyline positions={routeCoords} color="green" />
                    )}
                    <LocationMarker />
                    <MapUpdater />
                </MapContainer>
            </div>
        </>
    );
};

export default LocationPicker;
