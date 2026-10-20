import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView as RNWebView, type WebViewProps } from 'react-native-webview';

// react-native-webview 14 tipa el componente sin `ref`, pero en runtime sigue exponiendo postMessage.
type WebViewHandle = { postMessage: (data: string) => void };
const WebView = RNWebView as unknown as React.ForwardRefExoticComponent<WebViewProps & React.RefAttributes<WebViewHandle>>;
import { colors } from '../theme';
import { useLocationStore } from '../state/locationStore';
import type { StationMarker } from '../types';

type Props = {
  interactive?: boolean;
  markers?: StationMarker[];
  onMarkerPress?: (station: StationMarker) => void;
  selectedStationId?: string;
  bestStationId?: string;
  mapRef?: React.MutableRefObject<any>;
  topContentOffset?: number;
  onError?: () => void;
};

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    @keyframes pulse-dot {
      0% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.8); opacity: 0.2; }
      100% { transform: scale(1); opacity: 0.7; }
    }
    .leaflet-tile-pane { filter: brightness(1.7) contrast(1.08) saturate(1.1); }
    .user-loc-wrap {
      width: 64px; height: 64px;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .user-loc-pulse {
      width: 64px; height: 64px;
      border-radius: 50%;
      background: rgba(74, 122, 248, 0.28);
      position: absolute; top: 0; left: 0;
      animation: pulse-dot 2s infinite;
    }
    .user-loc-dot {
      box-sizing: border-box;
      width: 20px; height: 20px;
      border-radius: 50%;
      background: #4A7AF8;
      border: 3px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      position: relative;
    }
    .pin-price {
      font-family: -apple-system, Roboto, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { center: [-34.9, -56.2], zoom: 12, zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

    var markers = {};
    var userMarker = null;
    var selectedId = null;
    var bestId = null;

    function setUserLocation(lat, lng) {
      if (userMarker) { userMarker.setLatLng([lat, lng]); return; }
      var html = '<div class="user-loc-wrap"><div class="user-loc-pulse"></div><div class="user-loc-dot"></div></div>';
      var icon = L.divIcon({ className: '', html: html, iconSize: [64, 64], iconAnchor: [32, 32] });
      userMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
    }

    function setMarkers(data) {
      for (var id in markers) { map.removeLayer(markers[id]); }
      markers = {};

      data.forEach(function(m) {
        var isSelected = m.stationId === selectedId;
        var isBest = m.stationId === bestId;
        var borderColor = isBest ? '#FFD700' : (isSelected ? '#35D07F' : '#FFFFFF');
        var bgBadge = isBest ? '#FFD700' : (isSelected ? '#35D07F' : '#021A70');
        var textColor = isBest ? '#011360' : (isSelected ? '#011360' : '#FFFFFF');
        var iconColor = isBest ? '#011360' : (isSelected ? '#011360' : '#FFFFFF');

        var html = '<div style="display:flex;flex-direction:column;align-items:center;position:relative">' +
          '<div class="pin-price" style="background:' + bgBadge + ';border:1.5px solid ' + borderColor + ';border-radius:12px;padding:4px 9px;color:' + textColor + ';font-size:12px;font-weight:800;white-space:nowrap">' +
          (m.price ? '$' + m.price.toFixed(2) : '?') +
          '</div><div style="width:26px;height:26px;margin-top:2px;border-radius:13px;background:' + bgBadge + ';border:1.5px solid ' + borderColor + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="18" height="18" fill="' + iconColor + '"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div></div>';

        var icon = L.divIcon({ className: '', html: html, iconSize: [120, 56], iconAnchor: [60, 56] });
        var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
        marker.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', stationId: m.stationId }));
        });
        markers[m.stationId] = marker;
      });
    }

    function flyTo(lat, lng) {
      map.flyTo([lat, lng], 14, { duration: 0.3 });
    }

    function fitAll(points, topOffset) {
      if (!points || points.length === 0) return;
      if (points.length === 1) {
        map.setView(points[0], 14, { animate: true, duration: 0.5 });
        return;
      }
      var bounds = L.latLngBounds(points);
      var opts = { maxZoom: 15, animate: true, duration: 0.5 };
      if (topOffset) {
        opts.paddingTopLeft = [60, topOffset];
        opts.paddingBottomRight = [60, 60];
      } else {
        opts.padding = [60, 60];
      }
      map.fitBounds(bounds, opts);
    }

    function handleMessage(data) {
      try {
        var msg = JSON.parse(data);
        if (msg.type === 'setMarkers') { selectedId = msg.selectedId || null; bestId = msg.bestId || null; setMarkers(msg.data); }
        if (msg.type === 'flyTo') flyTo(msg.lat, msg.lng);
        if (msg.type === 'setUserLocation') setUserLocation(msg.lat, msg.lng);
        if (msg.type === 'fitAll') fitAll(msg.points, msg.topOffset);
      } catch(err) {}
    }

    window.addEventListener('message', function(e) { handleMessage(e.data); });
    document.addEventListener('message', function(e) { handleMessage(e.data); });
  </script>
</body>
</html>
`;

export const MapBackground = ({
  interactive = false,
  markers = [],
  onMarkerPress,
  selectedStationId,
  bestStationId,
  mapRef: externalRef,
  topContentOffset = 0,
  onError,
}: Props) => {
  const { coords } = useLocationStore();
  const webViewRef = useRef<WebViewHandle>(null);
  const internalRef = useRef<any>(null);
  const mapRef = externalRef ?? internalRef;
  const [webviewReady, setWebviewReady] = useState(false);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const bestIdRef = useRef(bestStationId);
  bestIdRef.current = bestStationId;

  const postToWebview = useCallback((msg: object) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(msg));
    }
  }, []);

  const sendMarkers = useCallback(() => {
    if (markersRef.current.length > 0) {
      postToWebview({ type: 'setMarkers', data: markersRef.current, selectedId: selectedStationId, bestId: bestIdRef.current });
    }
  }, [postToWebview, selectedStationId]);

  const flyToCoords = useCallback((lat: number, lng: number) => {
    postToWebview({ type: 'flyTo', lat, lng });
  }, [postToWebview]);

  const sendUserLocation = useCallback((lat: number, lng: number) => {
    postToWebview({ type: 'setUserLocation', lat, lng });
  }, [postToWebview]);

  useEffect(() => {
    if (webviewReady && markers.length > 0) {
      sendMarkers();
    }
  }, [markers, webviewReady, sendMarkers]);

  useEffect(() => {
    if (webviewReady && selectedStationId) {
      sendMarkers();
    }
  }, [selectedStationId, webviewReady, sendMarkers]);

  useEffect(() => {
    if (webviewReady && bestStationId) {
      sendMarkers();
    }
  }, [bestStationId, webviewReady, sendMarkers]);

  useEffect(() => {
    if (coords && webviewReady) {
      sendUserLocation(coords.latitude, coords.longitude);
      const t = setTimeout(() => flyToCoords(coords.latitude, coords.longitude), 200);
      return () => clearTimeout(t);
    }
  }, [coords, webviewReady, flyToCoords, sendUserLocation]);

  useEffect(() => {
    if (coords && markers.length > 0 && webviewReady) {
      const points: Array<[number, number]> = markers.map(m => [m.latitude, m.longitude] as [number, number]);
      points.push([coords.latitude, coords.longitude]);
      const t = setTimeout(() => postToWebview({ type: 'fitAll', points, topOffset: topContentOffset }), 500);
      return () => clearTimeout(t);
    }
  }, [coords, markers, webviewReady, postToWebview, topContentOffset]);

  mapRef.current = {
    animateToRegion: () => {},
    recenter: () => {
      if (coords) flyToCoords(coords.latitude, coords.longitude);
    },
  };

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerPress') {
        const station = markersRef.current.find((m) => m.stationId === msg.stationId);
        if (station) onMarkerPress?.(station);
      }
    } catch {}
  }, [onMarkerPress]);

  const handleLoad = useCallback(() => {
    setWebviewReady(true);
  }, []);

  return (
    <View style={styles.container} pointerEvents={interactive ? 'auto' : 'none'}>
      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
        onLoad={handleLoad}
        onError={onError}
        onHttpError={onError}
        pointerEvents={interactive ? 'auto' : 'none'}
      />
    </View>
  );
};

MapBackground.displayName = 'MapBackground';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
  },
});
