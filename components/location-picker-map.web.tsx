/**
 * LocationPickerMap — Web implementation using Leaflet.
 * Tap anywhere on the map to drop a pin and get coordinates + address.
 */
import React, { forwardRef, useEffect, useRef } from "react";
import { View } from "react-native";

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
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Expose setCenter to parent
    React.useImperativeHandle(ref, () => ({
      setCenter: (lat, lng) => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'setCenter', lat, lng }, '*');
      },
    }));

    // Listen for picked location from iframe
    useEffect(() => {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'locationPicked') {
          onLocationPicked(e.data.lat, e.data.lng, e.data.address);
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onLocationPicked]);

    const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; }
  #hint { position:absolute; top:10px; left:50%; transform:translateX(-50%); z-index:1000;
    background:rgba(45,125,70,0.92); color:white; padding:6px 14px; border-radius:20px;
    font-size:12px; font-weight:600; font-family:-apple-system,sans-serif; pointer-events:none;
    white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
  #loading { position:absolute; bottom:10px; left:50%; transform:translateX(-50%); z-index:1000;
    background:rgba(255,255,255,0.95); color:#2D7D46; padding:5px 12px; border-radius:20px;
    font-size:11px; font-weight:600; font-family:-apple-system,sans-serif;
    box-shadow:0 2px 8px rgba(0,0,0,0.15); display:none; }
</style>
</head>
<body>
<div id="map"></div>
<div id="hint">Tap to pin your cleanup location</div>
<div id="loading" id="loading">Fetching address...</div>
<script>
var map = L.map('map', { zoomControl: true, attributionControl: false })
  .setView([${initialLat}, ${initialLng}], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

var marker = null;
var hint = document.getElementById('hint');
var loading = document.getElementById('loading');

function reverseGeocode(lat, lng) {
  loading.style.display = 'block';
  fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      loading.style.display = 'none';
      var addr = data.display_name || (lat.toFixed(4) + ', ' + lng.toFixed(4));
      // Shorten address: use suburb + city + state
      var parts = [];
      if (data.address) {
        if (data.address.suburb) parts.push(data.address.suburb);
        else if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
        if (data.address.city || data.address.town || data.address.village)
          parts.push(data.address.city || data.address.town || data.address.village);
        if (data.address.state) parts.push(data.address.state);
      }
      var shortAddr = parts.length > 0 ? parts.join(', ') : addr.split(',').slice(0,3).join(',');
      window.parent.postMessage({ type: 'locationPicked', lat: lat, lng: lng, address: shortAddr }, '*');
    })
    .catch(function() {
      loading.style.display = 'none';
      window.parent.postMessage({ type: 'locationPicked', lat: lat, lng: lng, address: lat.toFixed(4) + ', ' + lng.toFixed(4) }, '*');
    });
}

map.on('click', function(e) {
  var lat = e.latlng.lat;
  var lng = e.latlng.lng;
  if (marker) { map.removeLayer(marker); }
  marker = L.marker([lat, lng]).addTo(map);
  hint.textContent = 'Location pinned! ✓';
  hint.style.background = 'rgba(34,197,94,0.95)';
  reverseGeocode(lat, lng);
});

window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'setCenter') {
    map.setView([e.data.lat, e.data.lng], 14);
  }
});
</script>
</body>
</html>`;

    return (
      <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
        <iframe
          ref={iframeRef as any}
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' } as React.CSSProperties}
          sandbox="allow-scripts allow-same-origin"
        />
      </View>
    );
  }
);
