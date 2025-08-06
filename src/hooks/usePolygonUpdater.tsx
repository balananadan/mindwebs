import { useEffect, useRef } from 'react';
import { useMapStore } from '@/store/useMapStore';
import { weatherService } from '@/services/WeatherService';
import { applyColorRules } from '@/utils/colorUtils';
import { subDays, addDays } from 'date-fns';

export const usePolygonUpdater = () => {
  const {
    polygons,
    timeRange,
    dataSources,
    updatePolygon,
    setIsLoading,
     setPolygons,
  } = useMapStore();
  
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updatePolygons = async () => {
      if (polygons.length === 0) return;

      setIsLoading(true);

      try {
        // Update each polygon
        const updatePromises = polygons.map(async (polygon) => {
          const dataSource = dataSources.find(ds => ds.id === polygon.dataSourceId);
          if (!dataSource) return;

          try {
            // Fetch weather data for the polygon's time range
            const startDate = timeRange.mode === 'single' 
              ? subDays(timeRange.start, 1) 
              : timeRange.start;
            const endDate = timeRange.mode === 'single' 
              ? addDays(timeRange.end, 1) 
              : timeRange.end;

            const weatherData = await weatherService.fetchPolygonWeatherData(
              polygon.coordinates,
              startDate,
              endDate,
              [dataSource.field]
            );

            // Calculate the value based on time range mode
            let value: number;
            if (timeRange.mode === 'single') {
              value = weatherService.getValueAtTime(
                weatherData,
                timeRange.start,
                dataSource.field as keyof typeof weatherData[0]
              );
            } else {
              value = weatherService.calculateAverageValue(
                weatherData,
                timeRange.start,
                timeRange.end,
                dataSource.field as keyof typeof weatherData[0]
              );
            }

            // Apply color rules
            const color = applyColorRules(value, dataSource.colorRules);

            // Update polygon
            updatePolygon(polygon.id, {
              currentValue: Math.round(value * 100) / 100, // Round to 2 decimal places
              currentColor: color,
            });

          } catch (error) {
            console.error(`Error updating polygon ${polygon.id}:`, error);
            // Keep existing color on error
          }
        });

        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error updating polygons:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce updates to avoid too frequent API calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(updatePolygons, 500);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [polygons, timeRange, dataSources, updatePolygon, setIsLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
};