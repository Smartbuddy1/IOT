import React, { useEffect, useRef, useState } from 'react';

// List of installations from user's image with approximate coordinates
const locations = [
  { name: 'Sangamner', district: 'Ahmednagar', state: 'Maharashtra', coords: [19.5761, 74.2053], units: 10, org: 'Sangamner Municipal Council' },
  { name: 'Hupri', district: 'Kolhapur', state: 'Maharashtra', coords: [16.6212, 74.3414], units: 12, org: 'Hupri Municipal Council' },
  { name: 'Gadhinglaj', district: 'Kolhapur', state: 'Maharashtra', coords: [16.2291, 74.3496], units: 8, org: 'Gadhinglaj Municipal Council' },
  { name: 'Kagal', district: 'Kolhapur', state: 'Maharashtra', coords: [16.5819, 74.3168], units: 10, org: 'Kagal Municipal Council' },
  { name: 'Chandgad', district: 'Kolhapur', state: 'Maharashtra', coords: [15.9385, 74.2272], units: 10, org: 'Chandgad Nagar Panchayat' },
  { name: 'Shirol', district: 'Kolhapur', state: 'Maharashtra', coords: [16.7381, 74.6033], units: 10, org: 'Shirol Municipal Council' },
  { name: 'Murgud', district: 'Kolhapur', state: 'Maharashtra', coords: [16.4024, 74.1539], units: 12, org: 'Murgud Municipal Council' },
  { name: 'Ajara', district: 'Kolhapur', state: 'Maharashtra', coords: [16.1189, 74.2064], units: 12, org: 'Ajara Nagar Panchayat' },
  { name: 'Vadgaon', district: 'Kolhapur', state: 'Maharashtra', coords: [16.7456, 74.2443], units: 12, org: 'Vadgaon Municipal Council' },
  { name: 'Kurundwad', district: 'Kolhapur', state: 'Maharashtra', coords: [16.6853, 74.6063], units: 12, org: 'Kurundwad Municipal Council' },
  { name: 'Hatkanangale', district: 'Kolhapur', state: 'Maharashtra', coords: [16.7441, 74.4468], units: 12, org: 'Hatkanangale Nagar Panchayat' },
  { name: 'Jaysingpur', district: 'Kolhapur', state: 'Maharashtra', coords: [16.7766, 74.5517], units: 10, org: 'Jaysingpur Municipal Council' },
  { name: 'Ichalkaranji', district: 'Kolhapur', state: 'Maharashtra', coords: [16.6974, 74.4554], units: 10, org: 'Ichalkaranji Municipal Council' },
  { name: 'Panhala', district: 'Kolhapur', state: 'Maharashtra', coords: [16.8152, 74.1084], units: 10, org: 'Panhala Municipal Council' },
  
  { name: 'Bhokar', district: 'Nanded', state: 'Maharashtra', coords: [19.2132, 77.6713], units: 12, org: 'Bhokar Municipal Council' },
  { name: 'Mahur', district: 'Nanded', state: 'Maharashtra', coords: [19.8329, 77.9079], units: 10, org: 'Mahur Municipal Council' },
  { name: 'Hadgaon', district: 'Nanded', state: 'Maharashtra', coords: [19.4996, 77.6738], units: 10, org: 'Hadgaon Municipal Council' },
  { name: 'Kinwat', district: 'Nanded', state: 'Maharashtra', coords: [19.6277, 78.2045], units: 10, org: 'Kinwat Municipal Council' },
  { name: 'Dharmabad', district: 'Nanded', state: 'Maharashtra', coords: [18.9042, 77.8540], units: 10, org: 'Dharmabad Municipal Council' },
  { name: 'Loha', district: 'Nanded', state: 'Maharashtra', coords: [18.9405, 77.1066], units: 12, org: 'Loha Municipal Council' },
  
  { name: 'Mandvi Beach', district: 'Ratnagiri', state: 'Maharashtra', coords: [16.9934, 73.2750], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Bhatye Beach', district: 'Ratnagiri', state: 'Maharashtra', coords: [16.9749, 73.2845], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Ganpatipule', district: 'Ratnagiri', state: 'Maharashtra', coords: [17.1423, 73.2687], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Gavkhadi', district: 'Ratnagiri', state: 'Maharashtra', coords: [16.7915, 73.3283], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Lanja', district: 'Ratnagiri', state: 'Maharashtra', coords: [16.8529, 73.5519], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Ganeshgule', district: 'Ratnagiri', state: 'Maharashtra', coords: [16.8504, 73.2891], units: 'Under Execution', org: 'Ongoing Site' },
  { name: 'Velneshwar', district: 'Ratnagiri', state: 'Maharashtra', coords: [17.3879, 73.1970], units: 'Under Execution', org: 'Ongoing Site' },
  
  { name: 'Kalwan (Vani Gad)', district: 'Nashik', state: 'Maharashtra', coords: [20.4851, 73.7937], units: 12, org: 'Project Site' },
  { name: 'Trimbakeshwar Temple', district: 'Nashik', state: 'Maharashtra', coords: [19.9324, 73.5301], units: 10, org: 'Project Site' },
  
  { name: 'Mahad', district: 'Raigad', state: 'Maharashtra', coords: [18.0825, 73.4217], units: 10, org: 'Om Sai Enterprises' },
  { name: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', coords: [23.3441, 85.3096], units: 22, org: 'Project Site' },
  { name: 'Various Locations', district: 'Gujarat', state: 'Gujarat', coords: [22.2587, 71.1924], units: 12, org: 'Project Site' },
  { name: 'Ayodhya', district: 'Ayodhya', state: 'Uttar Pradesh', coords: [26.7922, 82.1998], units: 10, org: 'Ayodhya Municipal Council' },
  { name: 'Various Locations', district: 'Manipur', state: 'Manipur', coords: [24.6637, 93.9063], units: 12, org: 'Project Site' },
  { name: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh', coords: [31.1048, 77.1734], units: 12, org: 'Project Site' },
  { name: 'Malvan', district: 'Sindhudurg', state: 'Maharashtra', coords: [16.0645, 73.4673], units: 12, org: 'Project Site' },
  { name: 'Various Locations', district: 'Odisha', state: 'Odisha', coords: [20.9517, 85.0985], units: 12, org: 'Project Site' },
];

const InstallationsMap = () => {
  const mapRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Filtering States
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // Extract unique states and districts
  const uniqueStates = [...new Set(locations.map(l => l.state))].sort();
  const availableDistricts = selectedState 
    ? [...new Set(locations.filter(l => l.state === selectedState).map(l => l.district))].sort()
    : [];

  useEffect(() => {
    // Load Leaflet CSS and JS dynamically from CDN
    const loadLeaflet = () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setMapLoaded(true);
        document.body.appendChild(script);
      } else {
        if (window.L) setMapLoaded(true);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Initialize Map Once
  useEffect(() => {
    if (mapLoaded && window.L && !mapRef.current) {
      const L = window.L;

      // Set Boundaries for India (Tighter bounds)
      const southWest = L.latLng(6.75, 68.16);
      const northEast = L.latLng(35.50, 97.39);
      const bounds = L.latLngBounds(southWest, northEast);

      // Initialize map
      const map = L.map('india-installations-map', {
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        minZoom: 4.5,
      });
      
      // Automatically fit India into the view perfectly
      map.fitBounds(bounds);
      mapRef.current = map;

      // Base tile layer
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Create a layer group to easily clear and re-add markers
      layerGroupRef.current = L.layerGroup().addTo(map);

      // Watch theme changes to update tiles
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'data-theme') {
            const dark = document.documentElement.getAttribute('data-theme') === 'dark';
            tileLayer.setUrl(dark 
              ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' 
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            );
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });

      return () => observer.disconnect();
    }
  }, [mapLoaded]);

  // Handle Markers Rendering and Filtering
  useEffect(() => {
    if (!mapLoaded || !window.L || !mapRef.current || !layerGroupRef.current) return;

    const L = window.L;
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    // Clear existing markers
    layerGroup.clearLayers();

    // Filter locations
    let filteredLocs = locations;
    if (selectedState) filteredLocs = filteredLocs.filter(l => l.state === selectedState);
    if (selectedDistrict) filteredLocs = filteredLocs.filter(l => l.district === selectedDistrict);

    const boundsArr = [];

    // Add Markers
    filteredLocs.forEach(loc => {
      // Determine Pin Color: Orange for Ongoing, Blue for Active
      const isOngoing = loc.units === 'Under Execution';
      const pinColor = isOngoing ? '#f59e0b' : '#3b82f6'; // Amber/Orange vs Blue

      const customMarkerHtml = `
        <div style="background-color: ${pinColor}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative; top: -15px; left: -15px;">
          <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
        </div>
      `;

      const mapIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: customMarkerHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
      });

      const popupContent = `
        <div style="padding: 0.2rem; min-width: 180px;">
          <h4 style="margin: 0 0 0.5rem 0; font-weight: bold; color: #1e293b; font-size: 1.1rem; font-family: Cambria, Georgia, serif;">${loc.name}</h4>
          <p style="margin: 0 0 0.2rem 0; font-size: 0.9rem; color: #64748b; font-family: Cambria, Georgia, serif;">
            <strong>District/State:</strong> ${loc.district}, ${loc.state}
          </p>
          <p style="margin: 0 0 0.2rem 0; font-size: 0.9rem; color: #64748b; font-family: Cambria, Georgia, serif;">
            <strong>Organization:</strong> ${loc.org}
          </p>
          <div style="margin-top: 0.5rem; display: inline-block; background-color: ${isOngoing ? '#fef3c7' : '#e0e7ff'}; color: ${isOngoing ? '#d97706' : '#4f46e5'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: bold; font-family: Cambria, Georgia, serif;">
            Units: ${loc.units}
          </div>
        </div>
      `;

      const marker = L.marker(loc.coords, { icon: mapIcon }).bindPopup(popupContent);
      layerGroup.addLayer(marker);
      boundsArr.push(loc.coords);
    });

    // Auto-zoom to fit the filtered markers if there are any
    if (boundsArr.length > 0) {
      if (boundsArr.length === 1) {
        map.setView(boundsArr[0], 12); // Zoom in close if only one location
      } else {
        const markerBounds = L.latLngBounds(boundsArr);
        map.fitBounds(markerBounds, { padding: [50, 50], maxZoom: 10 });
      }
    } else {
      // If no locations (unlikely), reset to India bounds
      const southWest = L.latLng(6.75, 68.16);
      const northEast = L.latLng(35.50, 97.39);
      map.fitBounds(L.latLngBounds(southWest, northEast));
    }

  }, [mapLoaded, selectedState, selectedDistrict]);

  return (
    <div className="glass-panel animate-entrance delay-500" style={{ padding: '1.5rem', borderRadius: '12px', marginTop: '2rem' }}>
      
      {/* Header and Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
          📍 Nationwide Installations & Ongoing Projects
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '0.75rem', marginRight: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
              Active
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%' }}></span>
              Ongoing
            </span>
          </div>

          {/* Filters */}
          <select 
            className="form-input" 
            style={{ width: '160px', padding: '0.4rem', height: '36px' }}
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedDistrict(''); // Reset district when state changes
            }}
          >
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            className="form-input" 
            style={{ width: '160px', padding: '0.4rem', height: '36px' }}
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedState}
          >
            <option value="">All Districts</option>
            {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      
      {!mapLoaded && (
        <div style={{ height: '500px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          Loading Map Data...
        </div>
      )}
      
      <div 
        id="india-installations-map" 
        style={{ 
          height: '500px', 
          width: '100%', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          border: '1px solid var(--border-color)', 
          zIndex: 0,
          display: mapLoaded ? 'block' : 'none'
        }} 
      />
    </div>
  );
};

export default InstallationsMap;
