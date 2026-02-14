
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Always obtain the API key from process.env.API_KEY injected at runtime
  if (!process.env.API_KEY || process.env.API_KEY === "undefined") {
    throw new Error("API_KEY_MISSING");
  }

  // Create a fresh instance to ensure we use the current key from the selection dialog
  // Fixed: Always use direct named parameter for apiKey from process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use Gemini 3 Flash for efficient reasoning and fast performance
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
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    // Fixed: The .text is a getter property, not a method.
    const text = response.text;
    if (!text) {
      throw new Error("EMPTY_RESPONSE");
    }

    return text;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    // Specifically handle the "entity not found" error to trigger re-selection of the key
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("404")) {
      throw new Error("ENTITY_NOT_FOUND");
    }
    
    throw error;
  }
};
