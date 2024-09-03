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
    const [userLocation, setUserLocation] = useState(null);
    const mapRef = useRef(null); // Ссылка на экземпляр карты

    const handlePickupChange = (e) => {
        setPickup(e.target.value);
    };

    const handleDropoffChange = (e) => {
        setDropoff(e.target.value);
    };

    const MapUpdater = ({ location }) => {
        const map = useMap();
        useEffect(() => {
            if (location && map) {
                map.setView(location, 13);
            }
        }, [location, map]);
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
            const formattedCoords = coordinates.map(coord => [coord[1], coord[0]]); // Преобразуем в [longitude, latitude]
            const response = await axios.post(
                'https://api.openrouteservice.org/v2/directions/driving-car/json',
                {
                    coordinates: formattedCoords,
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

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                const coords = e.latlng;
                setDropoffCoords([coords.lat, coords.lng]);
                fetchAddress([coords.lat, coords.lng], setDropoff); // Получить адрес и установить в инпут dropoff
            }
        });
        return null;
    };

    return (
        <>
            <div className="absolute top-0 left-0 w-full p-4 z-10 bg-white bg-opacity-90 shadow-md">
                <input
                    type="text"
                    value={pickup}
                    onChange={handlePickupChange}
                    placeholder="Откуда вас забрать?"
                    className="w-full p-2 mb-2 border rounded text-black placeholder-gray-500 focus:outline-none"
                />
                <input
                    type="text"
                    value={dropoff}
                    onChange={handleDropoffChange}
                    placeholder="Куда отвезти?"
                    className="w-full p-2 border rounded text-black placeholder-gray-500 focus:outline-none"
                />
            </div>

            <div className="relative w-full h-screen">
                <MapContainer
                    center={[51.505, -0.09]} // Исходное положение
                    zoom={13}
                    className="w-full h-full"
                    style={{ marginTop: '8rem' }} // Отступ карты вниз на высоту инпутов
                    whenCreated={mapInstance => { mapRef.current = mapInstance }}
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
                        <Polyline positions={routeCoords} color="blue" />
                    )}
                    <LocationMarker />
                    <MapUpdater location={userLocation} />
                </MapContainer>
            </div>
        </>
    );
};

export default LocationPicker;