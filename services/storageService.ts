
import { Aircraft, Component } from '../types';
import { INITIAL_AIRCRAFT, INITIAL_COMPONENTS } from '../constants';

const DB_KEY_AIRCRAFT = 'skyguard_db_aircraft';
const DB_KEY_COMPONENTS = 'skyguard_db_components';

export const storageService = {
  saveData: (aircraft: Aircraft[], components: Component[]) => {
    try {
      localStorage.setItem(DB_KEY_AIRCRAFT, JSON.stringify(aircraft));
      localStorage.setItem(DB_KEY_COMPONENTS, JSON.stringify(components));
    } catch (error) {
      console.error("Errore nel salvataggio dei dati:", error);
    }
  },

  loadData: (): { aircraft: Aircraft[], components: Component[] } => {
    try {
      const savedAc = localStorage.getItem(DB_KEY_AIRCRAFT);
      const savedComp = localStorage.getItem(DB_KEY_COMPONENTS);

      return {
        aircraft: savedAc ? JSON.parse(savedAc) : INITIAL_AIRCRAFT,
        components: savedComp ? JSON.parse(savedComp) : INITIAL_COMPONENTS
      };
    } catch (error) {
      console.error("Errore nel caricamento dei dati:", error);
      return { aircraft: INITIAL_AIRCRAFT, components: INITIAL_COMPONENTS };
    }
  },

  clearData: () => {
    localStorage.removeItem(DB_KEY_AIRCRAFT);
    localStorage.removeItem(DB_KEY_COMPONENTS);
  },

  exportBackup: (aircraft: Aircraft[], components: Component[]) => {
    const data = JSON.stringify({ aircraft, components, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyguard_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
