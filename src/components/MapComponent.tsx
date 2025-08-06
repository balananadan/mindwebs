'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button, message, Modal, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useMapStore } from '@/store/useMapStore';
import { App } from 'antd';

// Fix for default markers
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface DrawingComponentProps {
  onPolygonComplete: (coordinates: [number, number][]) => void;
}

const DrawingComponent: React.FC<DrawingComponentProps> = ({ onPolygonComplete }) => {
  const map = useMap();
  const { isDrawing, setIsDrawing } = useMapStore();
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [tempPolygon, setTempPolygon] = useState<L.Polygon | null>(null);
  const [tempMarkers, setTempMarkers] = useState<L.Marker[]>([]);

  useMapEvents({
    click(e) {
      if (!isDrawing) return;

      const { lat, lng } = e.latlng;
      const newPoints = [...drawingPoints, [lat, lng] as [number, number]];
      
      if (newPoints.length > 12) {
        message.warning('Maximum 12 points allowed per polygon');
        return;
      }

      setDrawingPoints(newPoints);

      // Add marker for the new point
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'drawing-point',
          html: `<div style="background: #ff4d4f; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      }).addTo(map);

      const newMarkers = [...tempMarkers, marker];
      setTempMarkers(newMarkers);

      // Draw temporary polygon if we have at least 3 points
      if (newPoints.length >= 3) {
        if (tempPolygon) {
          map.removeLayer(tempPolygon);
        }

        const polygon = L.polygon(newPoints, {
          color: '#1890ff',
          fillColor: '#1890ff',
          fillOpacity: 0.3,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);

        setTempPolygon(polygon);
      }
    },
  });

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      message.warning('Polygon must have at least 3 points');
      return;
    }

    onPolygonComplete(drawingPoints);
    cancelDrawing();
  };

  const cancelDrawing = () => {
    // Clean up temporary elements
    if (tempPolygon) {
      map.removeLayer(tempPolygon);
      setTempPolygon(null);
    }
    tempMarkers.forEach(marker => map.removeLayer(marker));
    setTempMarkers([]);
    setDrawingPoints([]);
    setIsDrawing(false);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (tempPolygon) {
        map.removeLayer(tempPolygon);
      }
      tempMarkers.forEach(marker => map.removeLayer(marker));
    };
  }, [map, tempPolygon, tempMarkers]);

  if (!isDrawing) return null;

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded shadow-lg">
      <div className="space-y-2">
        <div className="text-sm font-medium">Drawing Polygon</div>
        <div className="text-xs text-gray-500">
          Points: {drawingPoints.length}/12
          {drawingPoints.length >= 3 && ' (Click Finish to complete)'}
        </div>
        <div className="flex space-x-2">
          <Button 
            size="small" 
            type="primary" 
            onClick={finishDrawing}
            disabled={drawingPoints.length < 3}
          >
            Finish
          </Button>
          <Button size="small" onClick={cancelDrawing}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

interface PolygonLayerProps {
  polygon: {
    id: string;
    name: string;
    coordinates: [number, number][];
    currentColor: string;
    currentValue?: number;
  };
  onDelete: (id: string) => void;
}

const PolygonLayer: React.FC<PolygonLayerProps> = ({ polygon, onDelete }) => {
  const map = useMap();
  const polygonRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (!polygon.coordinates || polygon.coordinates.length < 3) return;

    // Create polygon
    const leafletPolygon = L.polygon(polygon.coordinates, {
      color: polygon.currentColor,
      fillColor: polygon.currentColor,
      fillOpacity: 0.6,
      weight: 2,
    }).addTo(map);

    // Add popup with polygon info
    leafletPolygon.bindPopup(`
      <div>
        <div><strong>${polygon.name}</strong></div>
        <div>Value: ${polygon.currentValue ?? 'Loading...'}</div>
        <div style="margin-top: 8px;">
          <button onclick="window.deletePolygon('${polygon.id}')" 
                  style="background: #ff4d4f; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            Delete
          </button>
        </div>
      </div>
    `);

    polygonRef.current = leafletPolygon;

    // Global function for delete button in popup
    (window as typeof window & { deletePolygon: (id: string) => void }).deletePolygon = (id: string) => {
      onDelete(id);
    };

    return () => {
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current);
      }
    };
  }, [polygon, map, onDelete]);

  return null;
};

const MapComponent: React.FC = () => {
  const { 
    mapCenter, 
    mapZoom, 
    setMapCenter, 
    polygons, 
    addPolygon, 
    deletePolygon, 
    dataSources,
    isDrawing,
    setIsDrawing 
  } = useMapStore();
  
  const { message } = App.useApp();

  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState<[number, number][] | null>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');

  const handlePolygonComplete = (coordinates: [number, number][]) => {
    if (dataSources.length === 1) {
      // Auto-select if only one data source
      const polygonName = `Polygon ${polygons.length + 1}`;
      addPolygon({
        name: polygonName,
        coordinates,
        dataSourceId: dataSources[0].id,
        currentValue: undefined,
      });
      message.success('Polygon created successfully!');
    } else {
      // Show modal to select data source
      setPendingPolygon(coordinates);
      setShowDataSourceModal(true);
    }
  };

  const handleDataSourceSelection = () => {
    if (!pendingPolygon || !selectedDataSource) {
      message.error('Please select a data source');
      return;
    }

    const polygonName = `Polygon ${polygons.length + 1}`;
    addPolygon({
      name: polygonName,
      coordinates: pendingPolygon,
      dataSourceId: selectedDataSource,
      currentValue: undefined,
    });

    setShowDataSourceModal(false);
    setPendingPolygon(null);
    setSelectedDataSource('');
    message.success('Polygon created successfully!');
  };

  const startDrawing = () => {
    setIsDrawing(true);
  };

  const resetMapCenter = () => {
    setMapCenter([52.52, 13.41]); // Reset to Berlin
  };

  return (
    <div className="relative h-full w-full">
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={startDrawing}
          disabled={isDrawing}
        >
          Draw Polygon
        </Button>
        <Button onClick={resetMapCenter}>
          Reset Center
        </Button>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Drawing Component */}
          <DrawingComponent onPolygonComplete={handlePolygonComplete} />
          
          {/* Render existing polygons */}
          {polygons.map((polygon) => (
            <PolygonLayer
              key={polygon.id}
              polygon={polygon}
              onDelete={deletePolygon}
            />
          ))}
        </MapContainer>
      </div>

      {/* Data Source Selection Modal */}
      <Modal
        title="Select Data Source"
        open={showDataSourceModal}
        onOk={handleDataSourceSelection}
        onCancel={() => {
          setShowDataSourceModal(false);
          setPendingPolygon(null);
          setSelectedDataSource('');
        }}
        okButtonProps={{ disabled: !selectedDataSource }}
      >
        <div className="space-y-4">
          <p>Choose a data source for this polygon:</p>
          <Select
            style={{ width: '100%' }}
            placeholder="Select data source"
            value={selectedDataSource}
            onChange={setSelectedDataSource}
            options={dataSources.map(ds => ({
              label: ds.name,
              value: ds.id,
            }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default MapComponent;