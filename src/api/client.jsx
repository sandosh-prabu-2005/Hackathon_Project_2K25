import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const intensityApi = {
  predict: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/intensity/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    // Backend returns: { status, data: { intensity_knots, intensity_category, etc }, metadata }
    // Extract the data property
    const result = response.data;
    return {
      ...result.data,
      status: result.status,
      metadata: result.metadata
    };
  },
  
  health: async () => {
    const response = await api.get('/api/intensity/health');
    return response.data;
  }
};

export const trackApi = {
  predict: async (coordinates, numSteps = 3, stormSpeed = 50, month = null, stormDir = null) => {
    // Convert coordinates from [lat, lon] or {lat, lon} format to {latitude, longitude} format
    const formattedCoordinates = coordinates.map(coord => {
      if (Array.isArray(coord)) {
        return { latitude: coord[0], longitude: coord[1] };
      } else if (coord.latitude !== undefined && coord.longitude !== undefined) {
        return { latitude: coord.latitude, longitude: coord.longitude };
      } else if (coord.lat !== undefined && coord.lon !== undefined) {
        return { latitude: coord.lat, longitude: coord.lon };
      }
      return coord; // Pass through if already in correct format
    });
    
    const payload = {
      coordinates: formattedCoordinates,
      month: month || new Date().getMonth() + 1,  // Required: use provided month or current month
      num_steps: numSteps,
      storm_speed: stormSpeed
    };
    
    // Only add storm_dir if explicitly provided
    // If not provided, backend will auto-calculate from coordinates
    if (stormDir !== null && stormDir !== undefined) {
      payload.storm_dir = stormDir;
    }
    
    const response = await api.post('/api/track/predict', payload);
    
    // Backend returns direct object with predicted_track, predicted_points, etc
    return response.data;
  },
  
  trajectoryFeatures: async (coordinates) => {
    const response = await api.post('/api/track/trajectory-features', {
      coordinates
    });
    return response.data;
  },
  
  health: async () => {
    const response = await api.get('/api/track/health');
    return response.data;
  }
};

export const chatApi = {
  // Chat with DISA-Buddy disaster assistant
  sendMessage: async (message) => {
    try {
      const response = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const text = await response.text();
      return text || "Sorry, I couldn't process that. Try asking about disasters or emergency contacts.";
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  },

  // Health check for chat server
  health: async () => {
    try {
      const response = await fetch('http://localhost:4000/health');
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Chat server health check failed:', error);
      throw error;
    }
  }
};

export default api;
