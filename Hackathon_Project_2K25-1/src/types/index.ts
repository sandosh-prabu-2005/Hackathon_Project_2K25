export interface Station {
  name: string;
  station_name: string;
  latitude: number;
  longitude: number;
  river: string;
  district: string;
  state: string;
  basin: string;
}

export interface PredictionResult {
  chart_image: any;
  is_mock: any;
  status: 'Danger' | 'Warning' | 'Safe';
  prediction: string;
  probability: number;
  current_water_level: number;
  warning_level: number;
  danger_level: number;
  water_levels: number[];
  rainfall_data: number[];
  station_info: {
    name: string;
    latitude: number;
    longitude: number;
    river: string;
    district: string;
    state: string;
  };
}

export interface StationInfo {
  latitude: number;
  longitude: number;
  name: string;
  state: string;
  district: string;
  basin: string;
  river: string;
}
