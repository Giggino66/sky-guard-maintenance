
import { GoogleGenAI } from "@google/genai";
import { PredictionResult, Component } from "../types";

export const getMaintenanceAdvice = async (predictions: PredictionResult[], components: Component[]) => {
  // Always initialize GoogleGenAI with a named parameter and obtain the API key exclusively from process.env.API_KEY.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Utilizziamo gemini-3-flash-preview per analisi testuali rapide e affidabili
  const model = 'gemini-3-flash-preview';
  
  // Filtriamo i dati critici per non sovraccaricare il contesto
  const criticalItems = predictions.filter(p => p.daysRemaining < 90).slice(0, 15);
  
  const prompt = `
    Sei un ingegnere capo di manutenzione aeronautica per un aeroclub. 
    Analizza i seguenti dati sulle scadenze dei componenti e fornisci un report strategico.
    
    Usa un tono professionale, autoritario ma costruttivo. 
    Il report deve contenere:
    1. ANALISI URGENZE: Identifica i componenti con scadenza < 15 giorni.
    2. PIANO DI PROCUREMENT: Suggerisci quali parti ordinare subito considerando i lead time.
    3. OTTIMIZZAZIONE: Consiglia come raggruppare gli interventi per minimizzare il fermo macchina (hangarage).
    4. RISCHI: Avvisa sui pericoli di superamento scadenze per la sicurezza volo.

    DATI SCADENZE (Prossimi 90 giorni):
    ${JSON.stringify(criticalItems, null, 2)}
    
    DETTAGLI COMPONENTI (Lead times & Criticità):
    ${JSON.stringify(components.map(c => ({ name: c.name, leadTime: c.leadTimeDays, criticality: c.criticality })), null, 2)}

    Rispondi in italiano. Usa Markdown per la formattazione (titoli, liste, grassetto).
  `;

  try {
    // Correctly call generateContent with model and contents (simple string for text prompts is preferred).
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    // Directly access the .text property on the GenerateContentResponse object.
    if (!response || !response.text) {
      console.warn("Risposta vuota dal modello Gemini.");
      return "Il sistema AI non ha prodotto risultati. Riprova tra qualche istante.";
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    // Gestione errori specifica per superamento limiti o chiavi non valide
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      return "Limite di richieste AI superato. Riprova più tardi.";
    }
    return `Errore tecnico durante l'analisi AI: ${error.message || "Connessione fallita"}`;
  }
};
