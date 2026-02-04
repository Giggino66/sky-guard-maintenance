
export const MaintenanceType = {
  FLIGHT_HOURS: 'FH',
  OPERATING_HOURS: 'OH',
  CYCLES: 'C',
  CALENDAR: 'CAL'
};

export const Criticality = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};

export interface Aircraft {
  id: string;
  registration: string;
  model: string;
  totalFlightHours: number;
  totalOperatingHours: number;
  totalCycles: number;
  avgMonthlyFH: number;
  avgMonthlyCycles: number;
}

export interface MaintenanceRequirement {
  id: string;
  type: string;
  interval: number;
  lastPerformedValue: number | string;
  nextDueValue: number | string;
  description: string;
}

export interface Component {
  id: string;
  name: string;
  serialNumber: string;
  aircraftId: string | null;
  criticality: string;
  requirements: MaintenanceRequirement[];
  leadTimeDays: number;
  // Tracking for ground items
  currentFH: number;
  currentOH: number;
  currentCycles: number;
}

export interface PredictionResult {
  componentId: string;
  componentName: string;
  aircraftRegistration: string;
  requirementDescription: string;
  estimatedDueDate: Date;
  daysRemaining: number;
  actionRequired: 'Monitor' | 'Procure' | 'Immediate';
}
