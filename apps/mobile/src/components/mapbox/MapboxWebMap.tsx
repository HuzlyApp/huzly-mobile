import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { LineStringGeometry } from '@/lib/mapbox/directions';

type Marker = { id: string; lng: number; lat: number; selected?: boolean };

function escapeJsonForScript(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function buildMapHtml(params: {
  accessToken: string;
  center: { lng: number; lat: number };
  zoom: number;
  route?: LineStringGeometry | null;
  markers?: Marker[];
  fit: 'route' | 'center' | 'markers';
}): string {
  const { accessToken, center, zoom, route, markers = [], fit } = params;
  const routeJson = escapeJsonForScript(route ?? null);
  const markersJson = escapeJsonForScript(markers);
  const centerJson = escapeJsonForScript([center.lng, center.lat]);
  const tokenJs = JSON.stringify(accessToken);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = ${tokenJs};
    var center = ${centerJson};
    var map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: ${zoom}
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    var route = ${routeJson};
    var markers = ${markersJson};
    var fitMode = ${JSON.stringify(fit)};

    map.on('load', function () {
      if (route && route.coordinates && route.coordinates.length) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: route, properties: {} }
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2563EB', 'line-width': 5, 'line-opacity': 0.88 }
        });
      }

      var bounds = new mapboxgl.LngLatBounds();
      if (fitMode === 'route' && route && route.coordinates && route.coordinates.length) {
        route.coordinates.forEach(function (c) { bounds.extend(c); });
        map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 0 });
      } else if (fitMode === 'markers' && markers.length) {
        markers.forEach(function (m) { bounds.extend([m.lng, m.lat]); });
        map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 0 });
      }

      var markerEls = [];
      markers.forEach(function (m) {
        var el = document.createElement('div');
        el.style.width = m.selected ? '44px' : '36px';
        el.style.height = m.selected ? '56px' : '48px';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'flex-end';
        el.style.justifyContent = 'center';
        el.innerHTML = '<div style="width:100%;height:100%;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));">' +
          '<svg viewBox="0 0 48 56" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M24 2C14 2 6 10 6 20c0 14 18 34 18 34s18-20 18-34C42 10 34 2 24 2z" fill="#111827"/>' +
          '<circle cx="24" cy="20" r="10" fill="#2563EB"/>' +
          '</svg></div>';
        var mk = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([m.lng, m.lat]).addTo(map);
        markerEls.push({ id: m.id, marker: mk, el: el });
        el.addEventListener('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerTap', id: m.id }));
          }
        });
      });
    });
  </script>
</body>
</html>`;
}

type Props = {
  accessToken: string;
  center: { lng: number; lat: number };
  zoom?: number;
  route?: LineStringGeometry | null;
  markers?: Marker[];
  fit?: 'route' | 'center' | 'markers';
  onMarkerPress?: (id: string) => void;
  /** Change to remount map when route/markers change materially */
  mapKey?: string;
};

export default function MapboxWebMap({
  accessToken,
  center,
  zoom = 11,
  route = null,
  markers = [],
  fit = 'center',
  onMarkerPress,
  mapKey,
}: Props) {
  const html = useMemo(
    () =>
      buildMapHtml({
        accessToken,
        center,
        zoom,
        route,
        markers,
        fit,
      }),
    [accessToken, center.lat, center.lng, zoom, route, markers, fit],
  );

  return (
    <View style={styles.wrap}>
      <WebView
        key={mapKey}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as { type?: string; id?: string };
            if (msg.type === 'markerTap' && msg.id && onMarkerPress) onMarkerPress(msg.id);
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#E2E8F0' },
  web: { flex: 1, backgroundColor: 'transparent' },
});
