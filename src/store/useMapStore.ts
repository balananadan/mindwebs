import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColorRule {
  id: string;
  operator: '=' | '<' | '>' | '<=' | '>=';
  value: number;
  color: string;
}

export interface DataSource {
  id: string;
  name: string;
  field: string;
  apiUrl: string;
  colorRules: ColorRule[];
}

export interface Polygon {
  id: string;
  name: string;
  coordinates: [number, number][];
  dataSourceId: string;
  currentColor: string;
  currentValue?: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
  mode: 'single' | 'range';
}

interface MapStore {
  // Timeline state
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  
  // Polygon state
  polygons: Polygon[];
  addPolygon: (polygon: Omit<Polygon, 'id' | 'currentColor'>) => void;
  deletePolygon: (id: string) => void;
  updatePolygon: (id: string, updates: Partial<Polygon>) => void;
  
  // Data source state
  dataSources: DataSource[];
  setDataSources: (sources: DataSource[]) => void;
  updateDataSource: (id: string, updates: Partial<DataSource>) => void;
  
  // Map state
  mapCenter: [number, number];
  mapZoom: number;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  
  // Drawing state
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const defaultDataSources: DataSource[] = [
  {
    id: 'open-meteo-temp',
    name: 'Temperature (°C)',
    field: 'temperature_2m',
    apiUrl: 'https://archive-api.open-meteo.com/v1/archive',
    colorRules: [
      { id: '1', operator: '<', value: 10, color: '#ff4d4f' },
      { id: '2', operator: '>=', value: 10, color: '#1890ff' },
      { id: '3', operator: '>=', value: 25, color: '#52c41a' },
    ],
  },
];

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      // Initial timeline - current hour
      timeRange: {
        start: new Date(),
        end: new Date(),
        mode: 'single',
      },
      setTimeRange: (range) => set({ timeRange: range }),
      
      // Polygon management
      polygons: [],
      addPolygon: (polygon) => set((state) => ({
        polygons: [
          ...state.polygons,
          {
            ...polygon,
            id: `polygon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            currentColor: '#cccccc',
          },
        ],
      })),
      deletePolygon: (id) => set((state) => ({
        polygons: state.polygons.filter(p => p.id !== id),
      })),
      updatePolygon: (id, updates) => set((state) => ({
        polygons: state.polygons.map(p => 
          p.id === id ? { ...p, ...updates } : p
        ),
      })),
      
      // Data source management
      dataSources: defaultDataSources,
      setDataSources: (sources) => set({ dataSources: sources }),
      updateDataSource: (id, updates) => set((state) => ({
        dataSources: state.dataSources.map(ds =>
          ds.id === id ? { ...ds, ...updates } : ds
        ),
      })),
      
      // Map state
      mapCenter: [52.52, 13.41], // Berlin coordinates
      mapZoom: 10,
      setMapCenter: (center) => set({ mapCenter: center }),
      setMapZoom: (zoom) => set({ mapZoom: zoom }),
      
      // UI state
      isDrawing: false,
      setIsDrawing: (drawing) => set({ isDrawing: drawing }),
      
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'map-dashboard-storage',
      partialize: (state) => ({
        polygons: state.polygons,
        dataSources: state.dataSources,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
      }),
    }
  )
);