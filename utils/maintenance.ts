
import { Aircraft, Component, MaintenanceType, PredictionResult } from '../types';

/**
 * Predicts the maintenance due date based on historical usage rates.
 * If component is on ground, usage is assumed static (0/day).
 */
export const calculatePrediction = (
  component: Component,
  aircraft: Aircraft | undefined,
  currentDate: Date = new Date()
): PredictionResult[] => {
  const results: PredictionResult[] = [];

  component.requirements.forEach(req => {
    let daysRemaining = Infinity;
    let dueDate = new Date(currentDate);

    // Get current value based on location
    const currentVal = aircraft ? (
      req.type === MaintenanceType.FLIGHT_HOURS ? aircraft.totalFlightHours :
      req.type === MaintenanceType.OPERATING_HOURS ? aircraft.totalOperatingHours :
      req.type === MaintenanceType.CYCLES ? aircraft.totalCycles : 0
    ) : (
      req.type === MaintenanceType.FLIGHT_HOURS ? component.currentFH :
      req.type === MaintenanceType.OPERATING_HOURS ? component.currentOH :
      req.type === MaintenanceType.CYCLES ? component.currentCycles : 0
    );

    switch (req.type) {
      case MaintenanceType.FLIGHT_HOURS: {
        const remainingHours = (Number(req.nextDueValue)) - currentVal;
        const dailyFH = aircraft ? (aircraft.avgMonthlyFH / 30.44) : 0;
        if (dailyFH > 0) {
          daysRemaining = remainingHours / dailyFH;
          dueDate.setDate(currentDate.getDate() + Math.floor(daysRemaining));
        }
        break;
      }
      case MaintenanceType.OPERATING_HOURS: {
        const remainingOH = (Number(req.nextDueValue)) - currentVal;
        const dailyOH = aircraft ? ((aircraft.avgMonthlyFH * 1.05) / 30.44) : 0;
        if (dailyOH > 0) {
          daysRemaining = remainingOH / dailyOH;
          dueDate.setDate(currentDate.getDate() + Math.floor(daysRemaining));
        }
        break;
      }
      case MaintenanceType.CYCLES: {
        const remainingCycles = (Number(req.nextDueValue)) - currentVal;
        const dailyCycles = aircraft ? (aircraft.avgMonthlyCycles / 30.44) : 0;
        if (dailyCycles > 0) {
          daysRemaining = remainingCycles / dailyCycles;
          dueDate.setDate(currentDate.getDate() + Math.floor(daysRemaining));
        }
        break;
      }
      case MaintenanceType.CALENDAR: {
        const nextDue = new Date(req.nextDueValue as string);
        daysRemaining = (nextDue.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
        dueDate = nextDue;
        break;
      }
    }

    let actionRequired: PredictionResult['actionRequired'] = 'Monitor';
    if (daysRemaining <= component.leadTimeDays) {
      actionRequired = 'Procure';
    }
    if (daysRemaining <= 7) {
      actionRequired = 'Immediate';
    }

    results.push({
      componentId: component.id,
      componentName: component.name,
      aircraftRegistration: aircraft?.registration || 'Storage',
      requirementDescription: req.description,
      estimatedDueDate: dueDate,
      daysRemaining: Math.max(0, isFinite(daysRemaining) ? Math.floor(daysRemaining) : 9999),
      actionRequired
    });
  });

  return results;
};
