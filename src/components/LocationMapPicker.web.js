import React from 'react';
import { View } from 'react-native';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_LOCATION = [48.8566, 2.3522];

function MapClickHandler({ onSelectionChange }) {
  useMapEvents({
    click({ latlng }) {
      onSelectionChange({
        latitude: latlng.lat,
        longitude: latlng.lng,
      });
    },
  });

  return null;
}

export default function LocationMapPicker({ selection, onSelectionChange }) {
  const center = selection
    ? [selection.latitude, selection.longitude]
    : DEFAULT_LOCATION;

  return (
    <View style={{ height: 320, overflow: 'hidden', borderRadius: 12 }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelectionChange={onSelectionChange} />
        {selection ? (
          <CircleMarker
            center={[selection.latitude, selection.longitude]}
            radius={9}
            pathOptions={{ color: '#2563EB', fillColor: '#3B82F6', fillOpacity: 0.9 }}
          />
        ) : null}
      </MapContainer>
    </View>
  );
}
