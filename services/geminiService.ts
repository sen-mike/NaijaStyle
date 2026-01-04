
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageQuality } from "../types";

const DEFAULT_PROMPT = `Create a high-quality, professional product photograph using this product image. 
The scene should reflect rich Nigerian culture and traditional aesthetics. 
Use Nigerian models where applicable, with natural skin tones and authentic features. 
Models should appear confident, elegant, and realistic. 
The background must be clean and professional, subtly decorated with Nigerian cultural elements such as traditional fabrics (Ankara, Aso-Oke), carved wooden artifacts, calabashes, beads, bronze accents, or symbolic patterns inspired by Nigerian heritage. 
Lighting should be studio-quality, soft but well-defined, highlighting the product clearly with realistic shadows and depth. 
The product from the uploaded image must remain the main focus at all times, integrated seamlessly into this premium environment. 
No clutter. No distortion. Sharp details. High resolution.`;

export async function generateProductPhoto(
  base64Image: string,
  mimeType: string,
  userPrompt: string = "",
  aspectRatio: AspectRatio = "1:1",
  quality: ImageQuality = 'Standard (Flash)'
): Promise<string> {
  const finalPrompt = userPrompt ? `${DEFAULT_PROMPT}\n\nAdditional user request: ${userPrompt}` : DEFAULT_PROMPT;
  
  // Decide model based on quality
  let modelName = 'gemini-2.5-flash-image';
  let imageSize: '1K' | '2K' | '4K' = '1K';

  if (quality === 'Premium (Pro 1K)') {
    modelName = 'gemini-3-pro-image-preview';
    imageSize = '1K';
  } else if (quality === 'Ultra (Pro 4K)') {
    modelName = 'gemini-3-pro-image-preview';
    imageSize = '4K';
  }

  // Create instance right before call as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    };

    if (modelName === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = imageSize;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1] || base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: finalPrompt,
          },
        ],
      },
      config: config
    });

    let generatedImageUrl = "";
    
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          generatedImageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }
    }

    if (!generatedImageUrl) {
      throw new Error("No image data returned from Gemini API");
    }

    return generatedImageUrl;
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    const errorMsg = error.message?.toLowerCase() || "";
    
    // Handle 403 Permission Denied or 404 Not Found by requesting a key reset/selection
    if (
      errorMsg.includes("403") || 
      errorMsg.includes("permission") || 
      errorMsg.includes("requested entity was not found") ||
      errorMsg.includes("not authorized")
    ) {
      throw new Error("API_KEY_RESET_REQUIRED");
    }
    throw error;
  }
}
