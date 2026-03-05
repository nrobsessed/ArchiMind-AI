import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CityHallRegulation {
  city: string;
  state: string;
  occupancyRate: string;
  utilizationCoefficient: string;
  frontSetback: string;
  permeabilityRate: string;
  permittedUses: string[];
  prohibitedUses: string[];
  estimatedFees: {
    item: string;
    cost: string;
  }[];
  expertTip: string;
}

export async function getCityHallRegulations(city: string, state: string): Promise<CityHallRegulation> {
  const prompt = `Aja como um especialista em legislação urbanística brasileira. 
  Forneça as normas e códigos de obras para a cidade de ${city}, ${state}. 
  Seja o mais preciso possível com base em dados reais de planos diretores e códigos de obras.
  Inclua taxas de ocupação, coeficientes de aproveitamento, recuos e taxas de permeabilidade típicas para zonas residenciais/comerciais centrais.
  Também liste o que é permitido e o que não é, e uma estimativa de taxas municipais (Alvará, ISS, etc).
  Adicione uma dica de especialista para arquitetos nessa região.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING },
          state: { type: Type.STRING },
          occupancyRate: { type: Type.STRING },
          utilizationCoefficient: { type: Type.STRING },
          frontSetback: { type: Type.STRING },
          permeabilityRate: { type: Type.STRING },
          permittedUses: { type: Type.ARRAY, items: { type: Type.STRING } },
          prohibitedUses: { type: Type.ARRAY, items: { type: Type.STRING } },
          estimatedFees: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                cost: { type: Type.STRING }
              },
              required: ["item", "cost"]
            }
          },
          expertTip: { type: Type.STRING }
        },
        required: [
          "city", "state", "occupancyRate", "utilizationCoefficient", 
          "frontSetback", "permeabilityRate", "permittedUses", 
          "prohibitedUses", "estimatedFees", "expertTip"
        ]
      }
    }
  });

  return JSON.parse(response.text);
}
