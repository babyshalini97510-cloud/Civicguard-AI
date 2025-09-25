import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Issue } from '../types';
import { villageBoundaries } from '../data/villageBoundaries';
import { getAllLocationData, District } from '../data/locationService';

// Let TypeScript know that Leaflet 'L' is available globally
declare var L: any;

interface MapViewProps {
    issues: Issue[];
    onSelectIssue: (issue: Issue) => void;
}

const MapView: React.FC<MapViewProps> = ({ issues, onSelectIssue }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const geoJsonLayerRef = useRef<any>(null);
    
    const [allLocationData, setAllLocationData] = useState<District[]>([]);
    const [selectedArea, setSelectedArea] = useState<{ name: string; issues: Issue[] } | null>(null);

    useEffect(() => {
        getAllLocationData().then(setAllLocationData);
    }, []);

    // Create a lookup map from village name to its parent panchayat
    const villageToPanchayatMap = useMemo(() => {
        const map = new Map<string, string>();
        allLocationData.forEach(district => {
            district.panchayats?.forEach(panchayat => {
                panchayat.villages.forEach(village => {
                    map.set(village, panchayat.name);
                });
            });
        });
        return map;
    }, [allLocationData]);

    // Memoize issue counts at the panchayat level
    const panchayatIssueCounts = useMemo(() => {
        const counts = new Map<string, number>();
        issues.forEach(issue => {
            if (issue.status !== 'Completed') {
                const panchayatName = issue.location.panchayat;
                counts.set(panchayatName, (counts.get(panchayatName) || 0) + 1);
            }
        });
        return counts;
    }, [issues]);

    const getColor = (count: number | undefined) => {
        if (count === undefined) return '#CCCCCC'; // Default grey
        if (count >= 4) return '#FF0000';    // Red
        if (count === 3) return '#FFA500';    // Orange
        if (count === 2) return '#FFFF00';    // Yellow
        if (count === 1) return '#90EE90';    // Light Green
        return '#006400';                      // Dark Green
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) {
            return;
        }
        
        const map = L.map(mapContainerRef.current).setView([11.0168, 76.9558], 10);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.locate({ setView: true, maxZoom: 12 });
        
        map.on('locationfound', (e: any) => {
            L.marker(e.latlng).addTo(map).bindPopup("📍 You are here").openPopup();
        });

        // Add Legend
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'info legend bg-white dark:bg-gray-800 p-2 rounded-md shadow-lg');
            const grades = [0, 1, 2, 3, 4];
            const labels = ['Very Few', 'Few', 'Medium', 'High', 'Very High'];
            div.innerHTML += '<h4 class="font-bold text-sm mb-1 text-gray-800 dark:text-gray-200">Pending Issues per Panchayat</h4>';
            for (let i = 0; i < grades.length; i++) {
                div.innerHTML +=
                    `<div class="flex items-center">
                       <i style="background:${getColor(grades[i])}; width: 18px; height: 18px; float: left; margin-right: 8px; opacity: 0.7;"></i>
                       <span class="text-xs text-gray-700 dark:text-gray-300">${labels[i]}</span>
                     </div>`;
            }
            return div;
        };
        legend.addTo(map);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Effect for GeoJSON heatmap layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map || villageToPanchayatMap.size === 0) return;

        const style = (feature: any) => {
            const villageName = feature.properties.name;
            const panchayatName = villageToPanchayatMap.get(villageName);
            const count = panchayatName ? panchayatIssueCounts.get(panchayatName) : undefined;
            
            return {
                fillColor: getColor(count),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        };

        if (geoJsonLayerRef.current) {
             geoJsonLayerRef.current.setStyle(style);
        } else {
            const geoJsonLayer = L.geoJSON(villageBoundaries, {
                style: style,
                onEachFeature: (feature: any, layer: any) => {
                    layer.on({
                        mouseover: (e: any) => {
                            const l = e.target;
                            l.setStyle({ weight: 4, color: '#4a5568', dashArray: '' });
                            l.bringToFront();
                        },
                        mouseout: (e: any) => {
                            geoJsonLayer.resetStyle(e.target);
                        },
                        click: (e: any) => {
                            const villageName = feature.properties.name;
                            const panchayatName = villageToPanchayatMap.get(villageName);
                            if (panchayatName) {
                                const panchayatIssues = issues.filter(issue => issue.location.panchayat === panchayatName);
                                setSelectedArea({ name: panchayatName, issues: panchayatIssues });
                                map.fitBounds(e.target.getBounds());
                            }
                        }
                    });
                }
            }).addTo(map);
            geoJsonLayerRef.current = geoJsonLayer;
        }

        // Update tooltips
        geoJsonLayerRef.current.eachLayer((layer: any) => {
            const villageName = layer.feature.properties.name;
            const panchayatName = villageToPanchayatMap.get(villageName);
            if (panchayatName) {
                const count = panchayatIssueCounts.get(panchayatName) || 0;
                layer.bindTooltip(`<b>${panchayatName}</b><br>${count} pending issue(s)`, { sticky: true });
            } else {
                 layer.bindTooltip(`<b>${villageName}</b><br>No panchayat data`, { sticky: true });
            }
        });

    }, [issues, panchayatIssueCounts, villageToPanchayatMap]);

    // Effect for individual issue markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach(marker => map.removeLayer(marker));
        markersRef.current = [];

        issues.forEach(issue => {
            if (issue.location.lat && issue.location.lng) {
                const iconColor = issue.status === 'Completed' ? 'grey' : 'blue';
                const customIcon = new L.Icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                
                const marker = L.marker([issue.location.lat, issue.location.lng], { icon: customIcon }).addTo(map);

                const popupContent = `<div class="p-1"><h4 class="font-bold text-md mb-1">${issue.title}</h4><p class="text-sm text-gray-600">${issue.category} - <span class="font-semibold">${issue.status}</span></p><button id="popup-btn-${issue.id}" class="w-full text-center px-2 py-1 mt-2 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow hover:bg-indigo-700">View Details</button></div>`;
                
                marker.bindPopup(popupContent);
                
                marker.on('popupopen', () => {
                    const btn = document.getElementById(`popup-btn-${issue.id}`);
                    if(btn) {
                       btn.onclick = () => onSelectIssue(issue);
                    }
                });
                
                markersRef.current.push(marker);
            }
        });
    }, [issues, onSelectIssue]);

    return (
        <div className="relative">
            <div ref={mapContainerRef} style={{ height: 'calc(100vh - 10rem)', width: '100%', borderRadius: '8px' }} />

            {selectedArea && (
                <div className="absolute top-2 left-2 z-[1000] w-full max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg max-h-[calc(100vh-12rem)] flex flex-col">
                    <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Issues in {selectedArea.name}</h3>
                        <button onClick={() => setSelectedArea(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&times;</button>
                    </div>
                    <div className="overflow-y-auto p-2">
                        {selectedArea.issues.length > 0 ? selectedArea.issues.map(issue => (
                            <div key={issue.id} className="p-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{issue.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{issue.category} - {issue.status}</p>
                                <button onClick={() => onSelectIssue(issue)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1">View Details</button>
                            </div>
                        )) : (
                            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No issues reported in this area.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapView;