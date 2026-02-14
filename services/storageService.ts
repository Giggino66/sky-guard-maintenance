
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
      console.error("Errore nel salvataggio:", error);
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
      console.error("Errore nel caricamento:", error);
      return { aircraft: INITIAL_AIRCRAFT, components: INITIAL_COMPONENTS };
    }
  },

  // Esporta i dati correnti in una stringa JSON
  exportData: (aircraft: Aircraft[], components: Component[]) => {
    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      aircraft,
      components
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skyguard_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Valida e processa i dati importati
  parseImportedData: (jsonString: string): { aircraft: Aircraft[], components: Component[] } | null => {
    try {
      const data = JSON.parse(jsonString);
      if (data.aircraft && Array.isArray(data.aircraft) && data.components && Array.isArray(data.components)) {
        return {
          aircraft: data.aircraft,
          components: data.components
        };
      }
      return null;
    } catch (e) {
      console.error("Invalid JSON format", e);
      return null;
    }
  }
};
