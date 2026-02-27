/**
 * VentureMap — Native implementation (iOS/Android) using react-native-maps.
 */
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import type { Venture } from "@/lib/mock-data";

export interface VentureMapHandle {
  animateTo: (lat: number, lng: number, delta?: number) => void;
}

interface VentureMapProps {
  userLat: number;
  userLng: number;
  radiusKm: number;
  ventures: Venture[];
  onVenturePress: (id: string) => void;
  showUserLocation?: boolean;
}

const PIN_COLORS: Record<string, string> = {
  proposed: '#2D7D46',
  ongoing: '#F5A623',
  finished: '#9BA1A6',
};

export const VentureMap = forwardRef<VentureMapHandle, VentureMapProps>(function VentureMap(
  { userLat, userLng, radiusKm, ventures, onVenturePress, showUserLocation = true },
  ref
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    animateTo: (lat, lng, delta = 0.3) => {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
        500
      );
    },
  }));

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: radiusKm > 20 ? 0.9 : 0.4,
        longitudeDelta: radiusKm > 20 ? 0.9 : 0.4,
      }}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={false}
    >
      <Circle
        center={{ latitude: userLat, longitude: userLng }}
        radius={radiusKm * 1000}
        strokeColor="#2D7D4660"
        fillColor="#2D7D4610"
        strokeWidth={1.5}
      />
      {ventures.map(v => (
        <Marker
          key={v.id}
          coordinate={{ latitude: v.coordinates.lat, longitude: v.coordinates.lng }}
          title={v.name}
          description={v.location}
          pinColor={PIN_COLORS[v.status] ?? '#2D7D46'}
          onCalloutPress={() => onVenturePress(v.id)}
        />
      ))}
    </MapView>
  );
});
