import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';

const CenteredMarker = ({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (position) {
            map.setView(position, map.getZoom(), { animate: true });
        }
    }, [position, map]);

    return <Marker position={position} />;
};

const DriverMapInOnline = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [orderInfo, setOrderInfo] = useState(null);
    const wsRef = useRef(null);

    useEffect(() => {
        wsRef.current = new WebSocket('ws://localhost:8080');

        wsRef.current.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received order data:', data);
            setOrderInfo(data);
        };

        wsRef.current.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    return (
        <div className="map-container">
            <MapContainer
                center={[60.7076, 28.7528]}
                zoom={13}
                className="w-full h-[450px]"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />
                {userLocation && (
                    <CenteredMarker position={userLocation} />
                )}
                {orderInfo && (
                    <>
                        <CenteredMarker position={orderInfo.pickupCoords} />
                        <CenteredMarker position={orderInfo.dropoffCoords} />
                    </>
                )}
            </MapContainer>
            <div className="order-info mt-2 p-2 bg-gray-100 border border-gray-300 rounded">
                {orderInfo ? (
                    <>
                        <h3>Информация о заказе</h3>
                        <p>Откуда: {orderInfo.pickup}</p>
                        <p>Куда: {orderInfo.dropoff}</p>
                        <p>Расстояние: {orderInfo.distance} км</p>
                        <p>Тариф: {orderInfo.tariff}</p>
                        <p>Цена: {orderInfo.price} рублей</p>
                    </>
                ) : (
                    'Информация о заказе не получена'
                )}
            </div>
        </div>
    );
};

export default DriverMapInOnline;
