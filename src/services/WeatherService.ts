import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Define the structure of expected weather data
interface WeatherData {
  time: string[];
  [key: string]: number[] | string[];
}

export const weatherService = {
  async fetchPolygonWeatherData(
    coordinates: [number, number][],
    startDate: Date,
    endDate: Date,
    fields: string[]
  ): Promise<WeatherData> {
    try {
      const center = getPolygonCenter(coordinates);
      const response = await axios.get<{ daily: WeatherData }>(API_BASE_URL, {
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else if (error instanceof Error) {
        console.error('Unexpected error:', error.message);
      } else {
        console.error('Unknown error:', error);
      }

      throw new Error('Failed to fetch polygon weather data');
    }
  },

  getValueAtTime(
    weatherData: WeatherData,
    date: Date,
    field: keyof WeatherData
  ): number {
    const dateStr = format(date, 'yyyy-MM-dd');
    const index = weatherData.time?.indexOf(dateStr);
    if (index === -1 || index == null) return NaN;
    const values = weatherData[field];
    return Array.isArray(values) && typeof values[index] === 'number'
      ? values[index] as number
      : NaN;
  },

  calculateAverageValue(
    weatherData: WeatherData,
    startDate: Date,
    endDate: Date,
    field: keyof WeatherData
  ): number {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    const time = weatherData.time || [];

    const startIdx = time.indexOf(startStr);
    const endIdx = time.indexOf(endStr);

    if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return NaN;

    const values = weatherData[field].slice(startIdx, endIdx + 1);
    const numericValues = values.filter((v): v is number => typeof v === 'number');
    const sum = numericValues.reduce((acc, val) => acc + val, 0);
    return sum / numericValues.length;
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
