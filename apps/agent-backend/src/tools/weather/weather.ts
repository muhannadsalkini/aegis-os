/**
 * ==========================================
 * 🌤️ Weather Tool
 * ==========================================
 * 
 * LEARNING NOTE: External API Integration
 * 
 * This tool uses Open-Meteo API which is:
 * - Completely free
 * - No API key required
 * - Returns detailed weather data
 * - Includes forecasts
 * 
 * This demonstrates:
 * 1. Geocoding (city name → coordinates)
 * 2. Weather data fetching
 * 3. Data transformation for the AI
 * 
 * The AI can now answer questions about weather anywhere!
 */

import type { Tool, ToolResult } from '../../types/tool.js';
import { validateCityName } from '../../utils/validation.js';
import { httpGet } from '../../utils/http.js';

/**
 * Weather code descriptions
 */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Geocode a city name to coordinates
 */
async function geocodeCity(city: string): Promise<{ lat: number; lon: number; name: string; country: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  
  const response = await httpGet(url, { timeout: 5000 });
  
  if (!response.success || !response.data) {
    return null;
  }
  
  try {
    const data = JSON.parse(response.data);
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const result = data.results[0];
    return {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country || '',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch weather data for coordinates
 */
async function fetchWeather(lat: number, lon: number): Promise<Record<string, unknown> | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  
  const response = await httpGet(url, { timeout: 5000 });
  
  if (!response.success || !response.data) {
    return null;
  }
  
  try {
    return JSON.parse(response.data);
  } catch {
    return null;
  }
}

/**
 * Weather Tool Definition
 */
export const weatherTool: Tool = {
  name: 'get_weather',
  
  description: `Get current weather and forecast for a city. Use this tool when:
- The user asks about weather conditions
- The user wants to know temperature, humidity, or wind
- The user asks about weather forecast
- The user is planning activities and needs weather info

Returns:
- Current temperature, humidity, wind
- Weather description (sunny, rainy, etc.)
- 7-day forecast summary

Example queries: "weather in London", "Tokyo temperature", "Paris forecast"`,
  
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name (e.g., "London", "New York", "Tokyo")',
      },
    },
    required: ['city'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      // Validate city name
      const validation = validateCityName(args.city as string);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const city = validation.sanitized!;
      console.log(`🌤️ Weather: Looking up "${city}"`);
      
      // Geocode the city
      const location = await geocodeCity(city);
      if (!location) {
        return {
          success: false,
          error: `Could not find city: ${city}. Try a different spelling or a nearby major city.`,
        };
      }
      
      console.log(`   Found: ${location.name}, ${location.country} (${location.lat}, ${location.lon})`);
      
      // Fetch weather data
      const weather = await fetchWeather(location.lat, location.lon);
      if (!weather) {
        return { success: false, error: 'Failed to fetch weather data' };
      }
      
      // Extract current weather
      const current = weather.current as Record<string, unknown>;
      const daily = weather.daily as Record<string, unknown[]>;
      
      const weatherCode = current.weather_code as number;
      const weatherDescription = WEATHER_CODES[weatherCode] || 'Unknown';
      
      // Build forecast summary (next 3 days)
      const forecast: Array<{
        date: string;
        high: number;
        low: number;
        condition: string;
        precipitationChance: number;
      }> = [];
      
      if (daily.time && Array.isArray(daily.time)) {
        const times = daily.time as string[];
        const maxTemps = daily.temperature_2m_max as number[];
        const minTemps = daily.temperature_2m_min as number[];
        const codes = daily.weather_code as number[];
        const precip = daily.precipitation_probability_max as number[];
        
        for (let i = 1; i <= 3 && i < times.length; i++) {
          const date = times[i];
          const high = maxTemps[i];
          const low = minTemps[i];
          const code = codes[i];
          const precipChance = precip[i];
          
          if (date !== undefined && high !== undefined && low !== undefined) {
            forecast.push({
              date,
              high,
              low,
              condition: code !== undefined ? (WEATHER_CODES[code] || 'Unknown') : 'Unknown',
              precipitationChance: precipChance ?? 0,
            });
          }
        }
      }
      
      const result = {
        location: {
          city: location.name,
          country: location.country,
          coordinates: { lat: location.lat, lon: location.lon },
        },
        current: {
          temperature: current.temperature_2m,
          feelsLike: current.apparent_temperature,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          windDirection: current.wind_direction_10m,
          condition: weatherDescription,
          units: {
            temperature: '°C',
            windSpeed: 'km/h',
            humidity: '%',
          },
        },
        forecast,
      };
      
      console.log(`   Current: ${result.current.temperature}°C, ${weatherDescription}`);
      
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Weather lookup failed',
      };
    }
  },
};

