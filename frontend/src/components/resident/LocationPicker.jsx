import { useEffect, useRef } from 'react';
import L from 'leaflet';

const DEFAULT_CENTER = [10.7765, 106.7019]; // HCMC center

function pinIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:#00B14F;border:2.5px solid #fff;transform:rotate(-45deg);
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
}

// Tap-to-pick location map. Controlled by lat/lng (numbers or null); calls
// onChange({lat,lng}) when the user taps the map. Lat/lng inputs live in the
// parent so they can be edited as text and flow back in via props.
export default function LocationPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  // One-shot init.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(DEFAULT_CENTER, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat: la, lng: ln } = e.latlng;
      onChangeRef.current?.({
        lat: Number(la.toFixed(6)),
        lng: Number(ln.toFixed(6)),
      });
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 80);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Sync marker + view to the controlled lat/lng.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
    if (!hasPoint) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      return;
    }
    const pos = [lat, lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(pos, { icon: pinIcon() }).addTo(map);
    } else {
      markerRef.current.setLatLng(pos);
    }
    map.panTo(pos);
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[200px] rounded-card overflow-hidden border border-hairline"
      style={{ background: '#eef2f4' }}
    />
  );
}
