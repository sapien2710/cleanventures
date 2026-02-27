/**
 * VentureMap — Web implementation using Leaflet.js via an inline HTML iframe.
 * OpenStreetMap tiles — no API key required.
 * Pins are always visible at any zoom level (country → street).
 */
import React, { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { View } from "react-native";
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

export const VentureMap = forwardRef<VentureMapHandle, VentureMapProps>(function VentureMap(
  { userLat, userLng, radiusKm, ventures, onVenturePress },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    animateTo: (lat, lng) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'flyTo', lat, lng }, '*');
    },
  }));

  // Listen for venture press messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'venture' && e.data.id) {
        onVenturePress(e.data.id);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onVenturePress]);

  const markersJson = JSON.stringify(
    ventures.map(v => ({
      id: v.id,
      lat: v.coordinates.lat,
      lng: v.coordinates.lng,
      name: v.name,
      location: v.location,
      status: v.status,
    }))
  );

  // Start at a zoom level that shows all of India so all pins are visible
  const initialZoom = 5;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; }
  .leaflet-popup-content-wrapper {
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  }
  .leaflet-popup-content { font-size: 12px; line-height: 1.5; margin: 10px 14px; }
  .popup-title { font-weight: 700; font-size: 14px; color: #1A2E1E; margin-bottom: 2px; }
  .popup-loc { color: #6B7B6E; font-size: 11px; margin-bottom: 8px; }
  .popup-status { display:inline-block; border-radius:20px; padding:2px 8px; font-size:10px; font-weight:700; margin-bottom:8px; }
  .popup-btn {
    display: block; background: #2D7D46; color: white;
    padding: 6px 12px; border-radius: 20px; font-size: 12px;
    font-weight: 600; text-decoration: none; cursor: pointer;
    text-align: center; border: none; width: 100%;
  }
  .pin-dot {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2.5px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    cursor: pointer;
  }
  .pin-wrapper {
    display: flex; flex-direction: column; align-items: center;
  }
  .pin-label {
    background: rgba(255,255,255,0.92);
    border-radius: 5px; padding: 1px 5px;
    font-size: 9px; font-weight: 700;
    margin-top: 2px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    color: #1A2E1E;
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
</head>
<body>
<div id="map"></div>
<script>
// Centre on India at country level so all pins are visible immediately
var map = L.map('map', {
  zoomControl: true,
  attributionControl: false,
  minZoom: 3,
  maxZoom: 19,
}).setView([20.5937, 78.9629], ${initialZoom});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// User location dot (only shown when GPS is available)
var userMarker = L.circleMarker([${userLat}, ${userLng}], {
  radius: 7, color: 'white', fillColor: '#3B82F6',
  fillOpacity: 1, weight: 2.5
}).addTo(map).bindTooltip('You are here', { permanent: false });

// Radius circle (shown at closer zoom levels)
var radiusCircle = L.circle([${userLat}, ${userLng}], {
  radius: ${radiusKm * 1000},
  color: '#2D7D46', fillColor: '#2D7D46',
  fillOpacity: 0.05, weight: 1.5, dashArray: '5 5'
}).addTo(map);

var pinColors = {
  proposed: '#2D7D46',
  ongoing: '#F5A623',
  finished: '#9BA1A6'
};

var statusLabels = {
  proposed: 'Proposed',
  ongoing: 'Active',
  finished: 'Done'
};

var statusBg = {
  proposed: '#E8F5ED',
  ongoing: '#FEF3C7',
  finished: '#F3F4F6'
};

var statusTextColor = {
  proposed: '#2D7D46',
  ongoing: '#92400E',
  finished: '#6B7280'
};

var ventures = ${markersJson};

ventures.forEach(function(v) {
  var color = pinColors[v.status] || '#2D7D46';
  var shortName = v.name.length > 18 ? v.name.substring(0, 16) + '…' : v.name;

  // Custom div icon — visible at any zoom level
  var icon = L.divIcon({
    className: '',
    html:
      '<div class="pin-wrapper">' +
        '<div class="pin-dot" style="background:' + color + ';"></div>' +
        '<div class="pin-label">' + shortName + '</div>' +
      '</div>',
    iconSize: [90, 34],
    iconAnchor: [45, 8],
    popupAnchor: [0, -10],
  });

  var statusBadge =
    '<span class="popup-status" style="background:' + statusBg[v.status] + ';color:' + statusTextColor[v.status] + '">' +
    statusLabels[v.status] + '</span>';

  var marker = L.marker([v.lat, v.lng], { icon: icon }).addTo(map);
  marker.bindPopup(
    '<div class="popup-title">' + v.name + '</div>' +
    '<div class="popup-loc">📍 ' + v.location + '</div>' +
    statusBadge +
    '<button class="popup-btn" onclick="window.parent.postMessage({type:\\'venture\\',id:\\'' + v.id + '\\'}, \\'*\\')">View Venture →</button>',
    { maxWidth: 200 }
  );
  marker.on('click', function() { marker.openPopup(); });
});

// Handle flyTo messages from React
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'flyTo') {
    map.flyTo([e.data.lat, e.data.lng], 14, { duration: 0.8 });
  }
  if (e.data && e.data.type === 'setRadius') {
    radiusCircle.setRadius(e.data.km * 1000);
  }
});
</script>
</body>
</html>`;

  return (
    <View style={{ flex: 1 }}>
      <iframe
        ref={iframeRef as any}
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none' } as React.CSSProperties}
        sandbox="allow-scripts allow-same-origin"
      />
    </View>
  );
});
