import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { useState, useEffect } from 'react';

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

const LocationPicker = () => {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const handlePickupChange = (e) => {
        setPickup(e.target.value);
    };

    const handleDropoffChange = (e) => {
        setDropoff(e.target.value);
    };

    // Хук для обновления карты при получении местоположения пользователя
    const MapUpdater = ({ location }) => {
        const map = useMap();
        useEffect(() => {
            if (location) {
                map.setView(location, 13); // Центрирование карты на местоположении пользователя
            }
        }, [location, map]);
        return null;
    };

    // Запрос местоположения пользователя
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation([latitude, longitude]);
                    fetchAddress([latitude, longitude], setPickup); // Задать адрес пользователя
                },
                (error) => {
                    console.error('Error getting location:', error);
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
        }
    }, []);

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

    const LocationMarker = ({ setCoords, isDropoff }) => {
        useMapEvents({
            click(e) {
                const coords = e.latlng;
                setCoords(coords);
                if (isDropoff) {
                    fetchAddress([coords.lat, coords.lng], setDropoff); // Получить адрес и установить в инпут dropoff
                }
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
                    style={{marginTop: '8rem'}} // Отступ карты вниз на высоту инпутов
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    {userLocation && <Marker position={userLocation}/>}
                    {pickupCoords && <Marker position={pickupCoords}/>}
                    {dropoffCoords && <Marker position={dropoffCoords}/>}
                    <LocationMarker setCoords={setPickupCoords}/>
                    <LocationMarker setCoords={setDropoffCoords} isDropoff={true}/> {/* Определяем маркер для dropoff */}
                    <MapUpdater location={userLocation}/> {/* Центрирование карты на местоположении */}
                </MapContainer>
            </div>
        </>
    );
};

export default LocationPicker;
