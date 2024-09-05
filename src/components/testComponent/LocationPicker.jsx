import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import marker1 from '/assets/marker-icon-blue.png';
import marker2 from '/assets/marker-icon-green.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import ecoImg from '/assets/eco1.png'
import comfImg from '/assets/comf1.png'
import kidsImg from '/assets/kids1.png'
import '../../App.css'
import Joyride from 'react-joyride'; // Импортируем Joyride


// Fix for missing marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker1,
    iconUrl: marker1,
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
    const [tourIsOpen, setTourIsOpen] = useState(true); // Управление состоянием для открытия/закрытия тура


    const steps = [
        {
            target: '.leaflet-container', // Это контейнер карты, измените класс в зависимости от вашего CSS
            content: 'Свайпни вверх чтобы начать',
            placement: 'top',
        },
        {
            target: '.leaflet-container', // Это тот же элемент, что и выше
            content: 'Чтобы указать маршрут, добавьте второй маркер на карту',
            placement: 'top',
        },
        {
            target: '.container', // Это контейнер с карточками, измените класс в зависимости от вашего CSS
            content: 'После выбора маршрута, выберите тариф',
            placement: 'bottom',
        },
    ];


    const calculatePriceEco = (distance) => {
        let basePrice;

        // Рассчитываем базовую цену
        if (distance <= 2) {
            basePrice = 150;
            console.log(`Расстояние ${distance} км: Базовая цена 150 рублей`);
        } else {
            basePrice = 150 + (distance - 2) * 20;
            console.log(`Расстояние ${distance} км: Базовая цена 150 + (${distance} - 2) * 20 = ${basePrice} рублей`);
        }

        // Рассчитываем дополнительную надбавку
        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
            console.log(`Расстояние ${distance} км: Дополнительная надбавка ${additionalBlocks} * 100 = ${additionalCharge} рублей`);
        }

        // Итоговая стоимость
        const totalPrice = basePrice + additionalCharge;
        console.log(`Итоговая стоимость: ${totalPrice.toFixed(1)} рублей`);

        return Math.round(totalPrice.toFixed(1));
    };

    const calculatePriceComf = (distance) => {
        let basePrice;

        // Рассчитываем базовую цену
        if (distance <= 2) {
            basePrice = 170;
            console.log(`Расстояние ${distance} км: Базовая цена 170 рублей`);
        } else {
            basePrice = 170 + (distance - 2) * 20;
            console.log(`Расстояние ${distance} км: Базовая цена 170 + (${distance} - 2) * 20 = ${basePrice} рублей`);
        }

        // Рассчитываем дополнительную надбавку
        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
            console.log(`Расстояние ${distance} км: Дополнительная надбавка ${additionalBlocks} * 100 = ${additionalCharge} рублей`);
        }

        // Итоговая стоимость
        const totalPrice = basePrice + additionalCharge;
        console.log(`Итоговая стоимость: ${totalPrice.toFixed(1)} рублей`);

        return Math.round(totalPrice.toFixed(1));
    };

    const calculatePriceKids = (distance) => {
        let basePrice;

        // Рассчитываем базовую цену
        if (distance <= 2) {
            basePrice = 190;
            console.log(`Расстояние ${distance} км: Базовая цена 190 рублей`);
        } else {
            basePrice = 190 + (distance - 2) * 20;
            console.log(`Расстояние ${distance} км: Базовая цена 190 + (${distance} - 2) * 20 = ${basePrice} рублей`);
        }

        // Рассчитываем дополнительную надбавку
        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
            console.log(`Расстояние ${distance} км: Дополнительная надбавка ${additionalBlocks} * 100 = ${additionalCharge} рублей`);
        }

        // Итоговая стоимость
        const totalPrice = basePrice + additionalCharge;
        console.log(`Итоговая стоимость: ${totalPrice.toFixed(1)} рублей`);

        return Math.round(totalPrice.toFixed(1));
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
        const [houseNumber, street] = parts;
        return `${street}, ${houseNumber}`;
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

    // Создаем кастомный маркер для второго маркера
    const dropoffIcon = new L.Icon({
        iconUrl: marker2,
        iconSize: [25, 41], // Укажите размеры иконки
        iconAnchor: [12, 41], // Позиция "якоря" (точка, где иконка касается карты)
        popupAnchor: [1, -34], // Позиция попапа относительно маркера
        shadowUrl: markerShadow, // Если у вас есть тень для маркера
        shadowSize: [41, 41], // Размер тени
        shadowAnchor: [12, 41] // Позиция "якоря" тени
    });

    return (
        <>
            <Joyride
                steps={steps}
                continuous={true}
                scrollToFirstStep={true}
                showProgress={true}
                showSkipButton={true}
                styles={{
                    options: {
                        zIndex: 10000, // Обеспечиваем, что Joyride будет поверх всех элементов
                    },
                }}
                run={tourIsOpen}
                callback={(data) => {
                    const { status } = data;
                    if (status === 'finished' || status === 'skipped') {
                        setTourIsOpen(false); // Закрываем тур после завершения или пропуска
                    }
                }}
            />
            <div className="">
                <MapContainer
                    center={[60.7076, 28.7528]}
                    zoom={13}
                    className="w-full h-96"
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
                            icon={dropoffIcon} // Используем кастомную иконку для второго маркера
                            eventHandlers={{
                                dragend: (e) => handleMarkerDrag(e, setDropoffCoords, setDropoff),
                            }}
                        />
                    )}
                    {routeCoords && (
                        <Polyline positions={routeCoords} color="green"/>
                    )}
                    <LocationMarker/>
                    <MapUpdater/>
                </MapContainer>
            </div>
            <div className="w-full p-2 z-10 bg-white bg-opacity-90 shadow-md">
                <div className="">
                    <div className="flex items-center mb-4">
                        <img src={marker1} alt="Marker 1" className="w-6 h-9 mr-2"/> {/* Размеры и отступ */}
                        <input
                            id="pickup"
                            type="text"
                            value={pickup}
                            placeholder="Откуда вас забрать?"
                            className="flex-grow p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            readOnly
                        />
                    </div>
                    <div className="flex items-center">
                        <img src={marker2} alt="Marker 2" className="w-6 h-9 mr-2"/> {/* Размеры и отступ */}
                        <input
                            id="dropoff"
                            type="text"
                            value={dropoff}
                            placeholder="Куда отвезти?"
                            className="flex-grow p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            readOnly
                        />
                    </div>
                </div>
            </div>
            <div className="container px-1 py-2">
                <div className="flex space-x-3 overflow-x-auto py-4">
                    <div className="flex-shrink-0 bg-white shadow-2xl rounded-lg overflow-hidden w-1/2 ">
                        <img className="object-cover" src={ecoImg}
                             alt="Card Image 1"/>
                        <div className="p-2">
                            <h3 className="text-xl font-bold mb-2">Эконом</h3>
                            <p className="text-gray-600">{`Цена: ${routeDistance ? calculatePriceEco(routeDistance) + ' рублей' : 'Появится после указания маршрута'}`}</p>
                        </div>
                    </div>
                    <div className="flex-shrink-0 bg-white shadow-2xl rounded-lg overflow-hidden w-1/2">
                        <img className="object-cover mt-0.5" src={comfImg}
                             alt="Card Image 2"/>
                        <div className="p-2">
                            <h3 className="text-xl font-bold mb-2">Комфорт</h3>
                            <p className="text-gray-600">{`Цена: ${routeDistance ? calculatePriceComf(routeDistance) + ' рублей' : 'Появится после указания маршрута'}`}</p>
                        </div>
                    </div>
                    <div className="flex-shrink-0 bg-white shadow-2xl rounded-lg overflow-hidden w-1/2">
                        <img className="object-cover mt-0.5" src={kidsImg}
                             alt="Card Image 3"/>
                        <div className="p-2">
                            <h3 className="text-xl font-bold mb-2">Детский</h3>
                            <p className="text-gray-600">{`Цена: ${routeDistance ? calculatePriceKids(routeDistance) + ' рублей' : 'Появится после указания маршрута'}`}</p>
                        </div>
                    </div>
                </div>
            </div>

            {routeDistance && (
                <div className="mt-2 text-black">
                    Расстояние: {routeDistance} км
                </div>
            )}
        </>
    );
};

export default LocationPicker;
