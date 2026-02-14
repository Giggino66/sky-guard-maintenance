
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Otteniamo la chiave esclusivamente da process.env.API_KEY
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }

  // Inizializzazione istantanea per riflettere eventuali cambi di chiave
  const ai = new GoogleGenAI({ apiKey });
  
  // Utilizzo di Gemini 3 Flash per velocità e capacità di ragionamento
  const model = 'gemini-3-flash-preview';
  
  const criticalTasks = predictions
    .filter(p => p.daysRemaining < 60)
    .slice(0, 15)
    .map(p => ({
      Componente: p.componentName,
      Aereo: p.aircraftRegistration,
      Requisito: p.requirementDescription,
      GiorniRimanenti: p.daysRemaining,
      DataScadenza: p.estimatedDueDate.toLocaleDateString(),
      Urgenza: p.actionRequired
    }));

  const systemInstruction = `Sei l'Ingegnere Capo di un Aeroclub (CAMO Manager).
Analizza i dati tecnici e genera un report di manutenzione professionale.
Usa un tono tecnico, preciso e focalizzato sulla sicurezza del volo (Safety First).
Formatta la risposta in Markdown con titoli chiari e liste puntate.
Rispondi esclusivamente in italiano.`;

  const prompt = `
Analisi Flotta SkyGuard - Dati Correnti:

SCADENZE CRITICHE PROSSIMI 60 GIORNI:
${JSON.stringify(criticalTasks, null, 2)}

INVENTARIO COMPONENTI E LEAD TIMES:
${JSON.stringify(components.map(c => ({ nome: c.name, leadTime: c.leadTimeDays, criticita: c.criticality })), null, 2)}

Genera un report strutturato come segue:
1. **PRIORITÀ IMMEDIATE**: Elenca i componenti che richiedono azione entro 7 giorni.
2. **STRATEGIA DI APPROVVIGIONAMENTO**: Suggerisci cosa ordinare ora basandoti sui Lead Times.
3. **EFFICIENZA HANGAR**: Suggerisci come raggruppare i lavori per ridurre il fermo macchina.
4. **VALUTAZIONE RISCHIO**: Nota finale sulla disponibilità della flotta.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    if (!response.text) {
      throw new Error("EMPTY_RESPONSE");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    // Rilanciamo l'errore specifico per essere gestito dalla UI
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    
    throw error;
  }
};
