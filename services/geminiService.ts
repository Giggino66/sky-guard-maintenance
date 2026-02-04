
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Initializing GoogleGenAI right before the call to use the latest API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-pro-preview for complex reasoning and strategic summary tasks
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
    // Directly accessing .text property as per @google/genai guidelines
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI advice. Please check your network connection.";
  }
};
