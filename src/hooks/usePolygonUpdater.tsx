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
  } = useMapStore();
  
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updatePolygons = async () => {
      if (polygons.length === 0) return;

      setIsLoading(true);

      try {
        const updatePromises = polygons.map(async (polygon) => {
          const dataSource = dataSources.find(ds => ds.id === polygon.dataSourceId);
          if (!dataSource) return;

          try {
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

            const color = applyColorRules(value, dataSource.colorRules);

            updatePolygon(polygon.id, {
              currentValue: Math.round(value * 100) / 100,
              currentColor: color,
            });

          } catch (error) {
            console.error(`Error updating polygon ${polygon.id}:`, error);
          }
        });

        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error updating polygons:', error);
      } finally {
        setIsLoading(false);
      }
    };

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

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
};
