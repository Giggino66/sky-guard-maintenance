
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Initialize AI with the environment API KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use gemini-3-flash-preview for fast and reliable reasoning on tabular data
  const model = 'gemini-3-flash-preview';
  
  // Prepare a refined context of critical maintenance tasks
  const criticalTasks = predictions
    .filter(p => p.daysRemaining < 60)
    .slice(0, 20)
    .map(p => ({
      Component: p.componentName,
      // Fixed: Quoted key "A/C" to avoid being interpreted as an arithmetic division operation (A / C)
      "A/C": p.aircraftRegistration,
      Requirement: p.requirementDescription,
      RemainingDays: p.daysRemaining,
      DueDate: p.estimatedDueDate.toLocaleDateString(),
      Severity: p.actionRequired
    }));

  const systemInstruction = `Sei un esperto Ingegnere di Manutenzione Aeronautica (CAMO Manager). 
Analizza i dati della flotta e fornisci un report strategico conciso e tecnico. 
Focalizzati sulla sicurezza del volo e sull'ottimizzazione del fermo macchina. 
Rispondi sempre in italiano professionale. Usa il grassetto per evidenziare i punti critici.`;

  const prompt = `
Analizza questa situazione della flotta:

SCADENZE CRITICHE:
${JSON.stringify(criticalTasks, null, 2)}

DETTAGLI COMPONENTI (Inventory):
${JSON.stringify(components.map(c => ({ name: c.name, leadTime: c.leadTimeDays, criticality: c.criticality })), null, 2)}

Genera un report suddiviso in:
1. **STATO DI ALLERTA IMMEDIATA**: Azioni da compiere entro 7 giorni.
2. **PIANIFICAZIONE LOGISTICA**: Parti da ordinare subito (considerando i lead times).
3. **STRATEGIA HANGAR**: Suggerimenti per raggruppare i lavori.
4. **VALUTAZIONE RISCHIO**: Impatto sulla disponibilità operativa dell'aeroclub.
  `;

  try {
    // Corrected: Using a simplified contents parameter and providing systemInstruction within config
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    // response.text is a property, not a method
    return response.text || "Impossibile generare il report al momento. Verifica la configurazione dell'API.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429")) return "Limite di quota raggiunto. Riprova tra un minuto.";
    return "Errore di comunicazione con il centro analisi AI. Verifica la connessione.";
  }
};
