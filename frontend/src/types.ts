export type Location = {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  coordinate_note?: string;
};

export type Forecast = {
  location: Location;
  issue_time: string;
  target_time: string;
  horizon_hours: number;
  predicted_volume: number;
  units: string;
  model_version: string;
  model_name: string;
  data_mode: string;
  source: string;
};

export type HistoryPoint = {
  timestamp: string;
  actual: number;
  predicted: number;
};

type Metric = { mae: number; rmse: number };
type SegmentMetric = Metric & { observations: number };

export type ModelMetadata = {
  model_version: string;
  model_name: string;
  horizon_hours: number;
  target: string;
  units: string;
  data_mode: string;
  source: string;
  source_period: { start: string; end: string };
  location: Location;
  evaluation: {
    validation: Record<string, Metric>;
    test: Record<string, Metric>;
  };
  feature_count: number;
  evaluation_periods?: Record<string, string[]>;
  row_counts?: Record<string, number>;
  error_analysis?: Record<string, SegmentMetric>;
};

export type User = { id: number | string; name: string; email: string };
