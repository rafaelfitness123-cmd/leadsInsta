import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedLead {
  profile_name?: string;
  instagram_handle: string;
  followers_count?: number;
  city?: string;
  bio?: string;
  parsing_confidence: number;
  raw_text: string;
}

export async function parseRawText(text: string): Promise<ParsedLead[]> {
  if (!text.trim()) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract Instagram profile information from the following raw text (likely from Google search results). 
      Focus on identifying the @instagram_handle correctly.
      
      Raw text:
      ${text}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              profile_name: { type: Type.STRING },
              instagram_handle: { type: Type.STRING },
              followers_count: { type: Type.NUMBER },
              city: { type: Type.STRING },
              bio: { type: Type.STRING },
              parsing_confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 1" }
            },
            required: ["instagram_handle", "parsing_confidence"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    return result.map((item: any) => ({
      ...item,
      raw_text: text.substring(0, 500) // Store a snippet of raw text
    }));
  } catch (error) {
    console.error("Error parsing text with Gemini:", error);
    return [];
  }
}
