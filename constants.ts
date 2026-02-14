
import { Aircraft, Component, MaintenanceType, Criticality } from './types';

export const INITIAL_AIRCRAFT: Aircraft[] = [
  {
    id: 'ac1',
    registration: 'I-MAUR',
    model: 'Cessna 172S',
    status: 'EFF',
    totalFlightHours: 2450.5,
    totalOperatingHours: 2580.2,
    totalCycles: 12400,
    avgMonthlyFH: 45,
    avgMonthlyCycles: 220
  },
  {
    id: 'ac2',
    registration: 'I-FLYH',
    model: 'Piper PA-28',
    status: 'PROG',
    totalFlightHours: 1200.0,
    totalOperatingHours: 1280.0,
    totalCycles: 6000,
    avgMonthlyFH: 30,
    avgMonthlyCycles: 150
  }
];

export const INITIAL_COMPONENTS: Component[] = [
  {
    id: 'cmp1',
    name: 'Engine Overhaul',
    serialNumber: 'L-24501-21',
    aircraftId: 'ac1',
    criticality: Criticality.HIGH,
    leadTimeDays: 45,
    currentFH: 0,
    currentOH: 0,
    currentCycles: 0,
    requirements: [
      {
        id: 'req1',
        type: MaintenanceType.FLIGHT_HOURS,
        interval: 2000,
        lastPerformedValue: 1200,
        nextDueValue: 3200,
        description: 'TBO Overhaul'
      }
    ]
  },
  {
    id: 'cmp2',
    name: 'ELT Battery',
    serialNumber: 'ELT-9988',
    aircraftId: 'ac1',
    criticality: Criticality.MEDIUM,
    leadTimeDays: 15,
    currentFH: 0,
    currentOH: 0,
    currentCycles: 0,
    requirements: [
      {
        id: 'req2',
        type: MaintenanceType.CALENDAR,
        interval: 730,
        lastPerformedValue: '2023-01-01',
        nextDueValue: '2025-01-01',
        description: 'Battery Expiry'
      }
    ]
  }
];
