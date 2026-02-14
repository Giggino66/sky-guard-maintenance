
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Initialize the Gemini client following best practices: use process.env.API_KEY directly via a named parameter.
  // We assume process.env.API_KEY is available as per environment configuration.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
    // Use .text property to access the generated content as per latest SDK guidelines.
    return response.text || "Nessun consiglio generato dall'AI.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore nella comunicazione con l'AI. Verifica la validità della chiave API e la connessione.";
  }
};
