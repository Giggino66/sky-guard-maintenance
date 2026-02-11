
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Accediamo alla chiave API tramite cast per evitare errori di compilazione TS
  const apiKey = (process.env as any).API_KEY;
  
  if (!apiKey) {
    console.warn("ATTENZIONE: API_KEY non configurata nelle variabili d'ambiente.");
    return "Impossibile generare consigli AI: Chiave API mancante. Configura API_KEY su Vercel.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    As an expert aeronautical maintenance engineer, analyze the following upcoming component expirations for an Aero Club.
    Provide a concise strategic summary including:
    1. Critical components needing immediate procurement.
    2. Risks associated with delaying maintenance.
    3. Optimization tips for maintenance scheduling.

    Data:
    ${JSON.stringify(predictions.filter(p => p.daysRemaining < 60))}
    
    Components Detail (Lead times):
    ${JSON.stringify(components.map(c => ({ name: c.name, leadTime: c.leadTimeDays, criticality: c.criticality })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text || "Nessun consiglio generato dall'AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore nella comunicazione con l'AI. Verifica la validità della chiave API e la connessione.";
  }
};
