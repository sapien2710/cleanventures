/**
 * LocationPickerMap — Native implementation (iOS/Android) using react-native-maps.
 * Tap anywhere on the map to drop a pin.
 */
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type MapPressEvent } from "react-native-maps";

export interface LocationPickerHandle {
  setCenter: (lat: number, lng: number) => void;
}

interface LocationPickerMapProps {
  initialLat: number;
  initialLng: number;
  onLocationPicked: (lat: number, lng: number, address: string) => void;
}

export const LocationPickerMap = forwardRef<LocationPickerHandle, LocationPickerMapProps>(
  function LocationPickerMap({ initialLat, initialLng, onLocationPicked }, ref) {
    const mapRef = useRef<MapView>(null);
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

    useImperativeHandle(ref, () => ({
      setCenter: (lat, lng) => {
        mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 400);
      },
    }));

    const handleMapPress = async (e: MapPressEvent) => {
      const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
      setPin({ lat, lng });
      // Reverse geocode via Nominatim
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const parts: string[] = [];
        if (data.address?.suburb) parts.push(data.address.suburb);
        else if (data.address?.neighbourhood) parts.push(data.address.neighbourhood);
        if (data.address?.city || data.address?.town || data.address?.village)
          parts.push(data.address.city || data.address.town || data.address.village);
        if (data.address?.state) parts.push(data.address.state);
        const addr = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationPicked(lat, lng, addr);
      } catch {
        onLocationPicked(lat, lng, `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    };

    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFillObject}
          initialRegion={{ latitude: initialLat, longitude: initialLng, latitudeDelta: 0.1, longitudeDelta: 0.1 }}
          onPress={handleMapPress}
        >
          {pin && (
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              pinColor="#2D7D46"
            />
          )}
        </MapView>
        <View style={styles.hint}>
          <Text style={styles.hintText}>{pin ? 'Location pinned ✓' : 'Tap to pin your cleanup location'}</Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  hint: {
    position: 'absolute', top: 10, alignSelf: 'center',
    backgroundColor: 'rgba(45,125,70,0.92)', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, zIndex: 10,
  },
  hintText: { color: 'white', fontSize: 12, fontWeight: '600' },
});
