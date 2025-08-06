// src/services/WeatherService.ts
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

export const weatherService = {
  async fetchPolygonWeatherData(
    coordinates: [number, number][],
    startDate: Date,
    endDate: Date,
    fields: string[]
  ) {
    try {
      const center = getPolygonCenter(coordinates);
      const response = await axios.get(API_BASE_URL, {
        params: {
          latitude: center[1],
          longitude: center[0],
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          daily: fields.join(','),
          timezone: 'auto',
        },
      });

      return response.data.daily;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('Unexpected error:', error);
      }

      throw new Error('Failed to fetch polygon weather data');
    }
  },

  getValueAtTime(
    weatherData: Record<string, any>,
    date: Date,
    field: keyof typeof weatherData
  ): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    const index = weatherData.time?.indexOf(dateStr);
    if (index === -1 || index == null) return NaN;
    return weatherData[field][index];
  },

  calculateAverageValue(
    weatherData: Record<string, any>,
    startDate: Date,
    endDate: Date,
    field: keyof typeof weatherData
  ): number {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    const time = weatherData.time || [];

    const startIdx = time.indexOf(startStr);
    const endIdx = time.indexOf(endStr);

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return NaN;

    const values = weatherData[field].slice(startIdx, endIdx + 1);
    const sum = values.reduce((acc: number, val: number) => acc + val, 0);
    return sum / values.length;
  }
};

// Helper to get the centroid of a polygon
function getPolygonCenter(coords: [number, number][]): [number, number] {
  const total = coords.length;
  const sum = coords.reduce(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0]
  );
  return [sum[0] / total, sum[1] / total];
}
