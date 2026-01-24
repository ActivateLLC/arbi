import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry } from "../types";
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generates a batch of technical sounding logs based on current system state
export const generateSystemLogs = async (count: number = 3): Promise<LogEntry[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} short, highly technical log lines for an automated e-commerce arbitrage bot called Arbi.
      The bot scans retailers, creates SEO pages, renders video ads, manages ad spend on TikTok/Meta, optimizes ROAS, and fulfills orders.
      
      Format the output as a JSON array of objects.
      The categories must be one of: "SCAN", "LIST", "AD", "CAMPAIGN", "ROI", "FULFILL".
      The message should be technical jargon (e.g., "Latency 24ms", "Bid cap adj", "Tracking updated").
      Keep messages under 10 words.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                enum: ["SCAN", "LIST", "AD", "CAMPAIGN", "ROI", "FULFILL"]
              },
              message: {
                type: Type.STRING
              }
            }
          }
        }
      }
    });

    const rawData = response.text ? JSON.parse(response.text) : [];
    
    // transform to internal type
    return rawData.map((item: any) => ({
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      category: item.category,
      message: item.message
    }));

  } catch (error) {
    console.error("Failed to generate logs via Gemini", error);
    // Fallback logs if API fails or key is missing
    return [
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        category: 'SYSTEM',
        message: 'Connection to neural engine stable.'
      },
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        category: 'SCAN',
        message: 'Scanning Target, Walmart, BestBuy APIs...'
      }
    ];
  }
};