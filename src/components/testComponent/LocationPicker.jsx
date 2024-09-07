import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {MapContainer, TileLayer, Marker, useMap, useMapEvents, Polyline} from 'react-leaflet';
import {useState, useEffect, useRef, useCallback} from 'react';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import Tour from 'reactour';
import './locationPicker.css'
import { useTelegram } from '../../hooks/useTelegram'; // импорт хука для работы с Telegram


import marker1 from '/assets/marker-icon-blue.png';
import marker2 from '/assets/marker-icon-green.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import ecoImg from '/assets/eco1.png';
import comfImg from '/assets/comf1.png';
import kidsImg from '/assets/kids1.png';
import swipeUp from '/assets/swipeUp.gif';
import swipeLeftRight from '/assets/SwipeLeftRight.gif';
import add2marker from '/assets/add2marker.gif';
// Fix for missing marker icons
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: marker1,
    iconUrl: marker1,
    shadowUrl: markerShadow,
});

const API_KEY = '5b3ce3597851110001cf6248143b17765c594c79a4a1a61dc30df2cb';

const LocationPicker = () => {
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoords, setPickupCoords] = useState(null);
    const [dropoffCoords, setDropoffCoords] = useState(null);
    const [routeCoords, setRouteCoords] = useState(null);
    const [routeDistance, setRouteDistance] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const mapRef = useRef(null); // Ссылка на экземпляр карты
    const [isTourOpen, setIsTourOpen] = useState(false);
    const [selectedTariff, setSelectedTariff] = useState(null);
    const { tg, user, userId, queryId } = useTelegram(); // используем хук для получения tg объекта



    // Определяем шаги тура
    const steps = [
        {
            selector: '.begin',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <p className='text-black text-center'>Проведите пальцем снизу - вверх, чтобы открыть приложение на весь
                        экран</p>
                    <img src={swipeUp} alt="Gif" className='size-40'/>
                </div>
            ),
        },
        {
            selector: '.leaMaps',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <div className='text-black text-center'>Верхнюю часть экрана занимает карта, именно на ней происходит выбор
                        маршрута.
                    </div>
                </div>
            ),
        },
        {
            selector: '#pickup',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <div className='text-black text-center'>
                        <div className='flex items-center justify-center'>
                            <img src={marker1}/>
                        </div>
                        Тут вы увидите физический адрес вашего местоположения. Ввести адрес
                        вручную пока нельзя.
                        Адрес появится автоматически. Для смены адреса, переместите маркер на карте.
                    </div>
                </div>
            ),
        },
        {
            selector: '#dropoff',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <div className='text-black text-center'>
                        <div className='flex items-center justify-center'>
                            <img src={marker2} />
                        </div>
                        Как указать конечную точку.
                    </div>
                    <div>
                        <img src={add2marker} alt="" className='size-64'/>
                    </div>
                </div>
            ),
            //content: ,
        },
        {
            selector: '.flex-shrink-0',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <p className='text-black text-center'>Здесь вы видите различные варианты тарифов. Свайп влево - покажет все имеющиеся тарифы.</p>
                    <img src={swipeLeftRight} alt="Gif" className='size-40'/>
                </div>
            ),
        },
        {
            selector: '.flex-shrink-0',
            content: (
                <div className='flex flex-col items-center justify-center'>
                    <p className='text-black text-center'>Когда вы определитесь с тарифом, нажмите на выбранный, появится кнопка - заказать.</p>
                </div>
            ),
        }
    ];

    // Проверяем, был ли уже показан тур
    useEffect(() => {
        const tourShown = localStorage.getItem('tourShown');
        if (!tourShown) {
            setIsTourOpen(true);
            localStorage.setItem('tourShown', 'true');
        }
    }, []);

    // Тур будет всегда показываться при входе
    // useEffect(() => {
    //     setIsTourOpen(true);
    // }, []);

    const calculatePriceEco = (distance) => {
        let basePrice;

        if (distance <= 2) {
            basePrice = 150;
        } else {
            basePrice = 150 + (distance - 2) * 20;
        }

        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
        }

        const totalPrice = basePrice + additionalCharge;
        return Math.round(totalPrice.toFixed(1));
    };

    const calculatePriceComf = (distance) => {
        let basePrice;

        if (distance <= 2) {
            basePrice = 170;
        } else {
            basePrice = 170 + (distance - 2) * 20;
        }

        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
        }

        const totalPrice = basePrice + additionalCharge;
        return Math.round(totalPrice.toFixed(1));
    };

    const calculatePriceKids = (distance) => {
        let basePrice;

        if (distance <= 2) {
            basePrice = 190;
        } else {
            basePrice = 190 + (distance - 2) * 20;
        }

        let additionalCharge = 0;
        if (distance > 10) {
            const extraDistance = distance - 10;
            const additionalBlocks = Math.floor(extraDistance / 10);
            additionalCharge = additionalBlocks * 100;
        }

        const totalPrice = basePrice + additionalCharge;
        return Math.round(totalPrice.toFixed(1));
    };

    //тарифы
    const tariffs = [
        { id: 'eco', name: 'Эконом', img: ecoImg, calculatePrice: calculatePriceEco },
        { id: 'comfort', name: 'Комфорт', img: comfImg, calculatePrice: calculatePriceComf },
        { id: 'kids', name: 'Детский', img: kidsImg, calculatePrice: calculatePriceKids },
    ];

    const MapUpdater = () => {
        const map = useMap();
        useEffect(() => {
            if (pickupCoords && dropoffCoords) {
                const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
                if (routeCoords) {
                    bounds.extend(routeCoords.map(coord => [coord[0], coord[1]]));
                }
                map.fitBounds(bounds, {padding: [50, 50]});
            } else if (pickupCoords) {
                map.setView(pickupCoords, 18);
            }
        }, [pickupCoords, dropoffCoords, routeCoords, map]);
        return null;
    };

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const {latitude, longitude} = position.coords;
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

    const logCoordinates = (pickupCoords, dropoffCoords) => {
        if (pickupCoords && dropoffCoords) {
            console.log("Координаты отправления:", pickupCoords);
            console.log("Координаты назначения:", dropoffCoords);
        }
    };

// Обновляем useEffect для отслеживания изменений координат
    useEffect(() => {
        if (pickupCoords && dropoffCoords) {
            getRoute([pickupCoords, dropoffCoords]);
            logCoordinates(pickupCoords, dropoffCoords); // Выводим координаты в консоль
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

    const dropoffIcon = new L.Icon({
        iconUrl: marker2,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: markerShadow,
        shadowSize: [41, 41],
        shadowAnchor: [12, 41]
    });

    useEffect(() => {
        if (pickup && dropoff && selectedTariff) {
            tg.MainButton.show();
            tg.MainButton.setParams({
                text: 'Заказать поездку',
            });
        } else {
            tg.MainButton.hide();
        }
    }, [pickup, dropoff, selectedTariff, tg]);

    const handleSendData = useCallback(() => {
        // Найти объект тарифа по selectedTariff (id)
        const selectedTariffObj = tariffs.find(tariff => tariff.id === selectedTariff);

        // Рассчитываем сумму заказа, если найдена функция расчета
        const totalPrice = selectedTariffObj
            ? selectedTariffObj.calculatePrice(routeDistance) // Функция расчета суммы на основе расстояния
            : 0; // Если тариф не найден, сумма будет 0

        const orderData = {
            pickup,
            dropoff,
            // Передаем name тарифа
            tariff: selectedTariffObj ? selectedTariffObj.name : selectedTariff,
            distance: routeDistance,
            price: totalPrice, // Добавляем сумму заказа
            user,
            queryId,
            userId
        };

        console.log("Данные для отправки:", orderData); // Логирование данных

        fetch('https://4ec0-185-108-19-43.ngrok-free.app/order-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        })
            .then(response => response.json())
            .then(result => {
                console.log('Success:', result);
                tg.close(); // Закрытие веб-приложения
            })
            .catch(error => {
                console.error('Error:', error);
            });

        tg.sendData(JSON.stringify(orderData));
    }, [pickup, dropoff, selectedTariff, routeDistance, tg, user, queryId, userId]);

    useEffect(() => {
        tg.onEvent('mainButtonClicked', handleSendData);
        return () => {
            tg.offEvent('mainButtonClicked', handleSendData);
        };
    }, [handleSendData, tg]);

    const handleOpenYandexMaps = () => {
        if (pickupCoords && dropoffCoords) {
            // Определяем начальную точку маршрута
            const startPoint = userLocation || pickupCoords;

            // Преобразование маршрута в строку для Яндекс.Карт
            const routeString = routeCoords ? routeCoords.map(coord => `${coord[1]},${coord[0]}`).join('~') : '';

            // Формирование URL для Яндекс.Карт
            const yandexMapsUrl = `https://yandex.ru/maps/?rtext=${startPoint[0]},${startPoint[1]}~${pickupCoords[0]},${pickupCoords[1]}~${dropoffCoords[0]},${dropoffCoords[1]}&rtt=auto&l=map&pt=${startPoint[1]},${startPoint[0]};${pickupCoords[1]},${pickupCoords[0]};${dropoffCoords[1]},${dropoffCoords[0]}`;

            // Открываем URL в новой вкладке
            window.open(yandexMapsUrl, '_blank');
        } else {
            alert('Пожалуйста, установите координаты отправления и назначения.');
        }
    };



    return (
        <>
            <div className='flex'>
                <div className='begin flex items-center justify-center'></div>
            </div>
            <Tour
                steps={steps}
                isOpen={isTourOpen}
                onRequestClose={() => {
                }}
                rounded={10}
                showButtons={true}
                showCloseButton={false}
                closeWithMask={false}
                disableInteraction={true}
                lastStepNextButton={
                    <div
                        className='px-4 py-2 text-white duration-100 bg-blue-500 rounded-lg shadow-md focus:shadow-none ring-offset-2 ring-indigo-600 focus:ring-2'
                        onClick={() => setIsTourOpen(false)}
                    >
                        Вперед
                    </div>
                }
                disableKeyboardNavigation={['esc']}
                styles={{
                    options: {
                        zIndex: 10000,
                        width: 'auto',
                        maxWidth: '100%',
                        margin: '0 auto',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }
                }}
            />


            <div className="leaMaps">
                <MapContainer
                    center={[60.7076, 28.7528]}
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
                            icon={dropoffIcon}
                            eventHandlers={{
                                dragend: (e) => handleMarkerDrag(e, setDropoffCoords, setDropoff),
                            }}
                        />
                    )}
                    {routeCoords && (
                        <Polyline positions={routeCoords} color="blue" weight={5}/>
                    )}

                    <LocationMarker/>
                    <MapUpdater/>
                </MapContainer>
            </div>

            <div className="w-full rounded-[20px] shadow-lg">
                <div className="">
                    <div className="flex items-center relative">
                        <input
                            id="pickup"
                            type="text"
                            value={pickup}
                            placeholder="Откуда вас забрать?"
                            className="flex-grow p-3 border-none placeholder-gray-500 focus:outline-none"
                            style={{
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                                "::placeholder": {
                                    color: "var(--tg-theme-hint-color)"
                                }
                            }}
                            readOnly
                        />
                    </div>
                    <div className="flex items-center relative">
                        <input
                            id="dropoff"
                            type="text"
                            value={dropoff}
                            placeholder="Куда отвезти?"
                            className="flex-grow p-3 border-none border-t border-gray-300 placeholder-gray-500 focus:outline-none"
                            style={{
                                backgroundColor: "var(--tg-theme-bg-color)",
                                color: "var(--tg-theme-text-color)",
                                "::placeholder": {
                                    color: "var(--tg-theme-hint-color)"
                                }
                            }}
                            readOnly
                        />
                    </div>
                </div>
            </div>


            <div className="container py-2">
                <div className="flex space-x-3 overflow-x-auto p-4">
                    {tariffs.map((tariff) => (
                        <div
                            key={tariff.id}
                            className={`flex-shrink-0 shadow-2xl rounded-lg overflow-hidden w-1/3 cursor-pointer ${
                                selectedTariff === tariff.id ? 'ring-4 ring-blue-600' : ''
                            }`}
                            onClick={() => setSelectedTariff(tariff.id)}
                        >
                            <img className="object-cover" src={tariff.img} alt={`${tariff.name} Image`}/>
                            <div className="p-2 text-sm">
                                <h3 className="font-bold mb-2">{tariff.name}</h3>
                                <p className="">
                                    {routeDistance
                                        ? `${tariff.calculatePrice(routeDistance)} рублей`
                                        : 'Сумма появится после указания маршрута'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <button
                onClick={handleOpenYandexMaps}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md"
            >
                Открыть в Яндекс.Картах
            </button>
        </>
    );
};

export default LocationPicker;
