import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { showData } from "../../utils/parseInfluxVehicle";
import { motion } from "framer-motion";
import { Car, AlertCircle } from "lucide-react";

import bike from "../../assets/bike.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom vehicle icon
const vehicleIcon = new L.Icon({
  iconUrl: bike,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

const VehicleMap = ({ vehicleId, range, showRoute = true }) => {
  const [routeData, setRouteData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [zoom, setZoom] = useState(13);
  const [mapKey, setMapKey] = useState(Date.now()); // For forcing remount
  const [mapStyle, setMapStyle] = useState("streets"); // streets, satellite, dark

  // Default center (Jakarta)
  const defaultCenter = [-6.2, 106.8];

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setLoading(true);

        const locationData = await showData(vehicleId, "location", range);

        if (locationData && locationData.length > 0) {
          // Convert the data to the format needed for Leaflet
          const parsedLocations = locationData
            .map((point) => [
              parseFloat(point[3]), // lat
              parseFloat(point[4]), // lng
            ])
            .filter((point) => !isNaN(point[0]) && !isNaN(point[1]));

          setRouteData(parsedLocations);

          if (parsedLocations.length > 0) {
            // Set current location to most recent point
            setCurrentLocation(parsedLocations[parsedLocations.length - 1]);

            // Auto-adjust zoom based on route length
            if (parsedLocations.length > 100) {
              setZoom(11);
            } else if (parsedLocations.length > 50) {
              setZoom(12);
            } else {
              setZoom(13);
            }

            // Force map to refresh with new center
            setMapKey(Date.now());
          }
        } else {
          setRouteData([]);
          setCurrentLocation(null);
        }
      } catch (err) {
        console.error("Error fetching route data:", err);
        setError("Failed to load map data");
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, [vehicleId, range]);

  // Calculate route stats
  const routeStats = useMemo(() => {
    if (routeData.length < 2) return { distance: 0, points: 0 };

    let totalDistance = 0;
    for (let i = 1; i < routeData.length; i++) {
      const prevPoint = L.latLng(routeData[i - 1][0], routeData[i - 1][1]);
      const currentPoint = L.latLng(routeData[i][0], routeData[i][1]);
      totalDistance += prevPoint.distanceTo(currentPoint);
    }

    return {
      distance: (totalDistance / 1000).toFixed(2), // km
      points: routeData.length,
    };
  }, [routeData]);

  const polylineOptions = { color: "blue", weight: 3 };

  return (
    <div className="relative h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 z-10 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-300">Loading map data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10 rounded-lg">
          <div className="text-center p-4">
            <AlertCircle className="mx-auto mb-3 text-red-500" size={32} />
            <p className="text-red-400">{error}</p>
            <button
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded p-2 flex gap-2">
        <button
          className={`px-2 py-1 rounded text-xs ${
            mapStyle === "streets"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setMapStyle("streets")}
        >
          Streets
        </button>
        <button
          className={`px-2 py-1 rounded text-xs ${
            mapStyle === "satellite"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setMapStyle("satellite")}
        >
          Satellite
        </button>
        <button
          className={`px-2 py-1 rounded text-xs ${
            mapStyle === "dark"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300"
          }`}
          onClick={() => setMapStyle("dark")}
        >
          Dark
        </button>
      </div>

      {routeData.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded p-3 text-xs text-gray-200">
          <div className="flex items-center mb-1">
            <Car size={14} className="mr-1" />
            <span>
              Vehicle ID: <strong>{vehicleId}</strong>
            </span>
          </div>
          <div className="mb-1">
            Route Points: <strong>{routeStats.points}</strong>
          </div>
          <div>
            Distance: <strong>{routeStats.distance} km</strong>
          </div>
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={currentLocation || defaultCenter}
        zoom={zoom}
        className="h-full w-full rounded-lg"
      >
        {/* Tile layer based on selected style */}
        {mapStyle === "streets" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {mapStyle === "satellite" && (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        {mapStyle === "dark" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}

        <MapRecenter center={currentLocation} />

        {/* Route polyline */}
        {showRoute && routeData.length > 1 && (
          <Polyline positions={routeData} pathOptions={polylineOptions} />
        )}

        {/* Current location marker */}
        {currentLocation && (
          <Marker position={currentLocation} icon={vehicleIcon}>
            <Popup>
              <div>
                <strong>Vehicle {vehicleId}</strong>
                <div>Lat: {currentLocation[0].toFixed(6)}</div>
                <div>Lng: {currentLocation[1].toFixed(6)}</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default VehicleMap;
