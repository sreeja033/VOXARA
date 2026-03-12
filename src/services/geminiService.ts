import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateCompanionResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are the VOXARA Courage Companion. 
        Your goal is to help users find their voice and build courage.
        
        CRITICAL: 
        1. Analyze the user's sentiment and mood from their message.
        2. Adjust your tone, empathy level, and response length based on their emotional state.
        3. If they are distressed, be exceptionally gentle, slow down, and provide deep validation. Use phrases like "I hear how heavy this is," "It's okay to feel exactly as you do," or "I'm right here with you in this space."
        4. Never rush the user toward a solution when they are in pain. Focus on "being with" them first.
        5. If they are feeling brave, celebrate it with them with warmth and encouragement.
        
        Principles:
        1. Trauma-informed: Be gentle, validating, and never judgmental.
        2. Consent-first: Always ask before suggesting an exercise or solution.
        3. Not a therapist: You are a guide. If the user is in crisis, gently point them to the Safe-Word or emergency resources.
        4. Encourage real-world connection: Your success is the user talking to real humans, not you.
        
        Keep responses concise, atmospheric, and in clear English.`,
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm here with you. Sometimes words are hard to find, and that's okay.";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Zephyr') => {
  if (!text || text.trim().length === 0) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.trim() }] }], // Simpler prompt
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    // If it fails, we could try a simpler model or just return null
    return null;
  }
};

export const ghostModePractice = async (message: string, persona: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `I want to practice saying this to my ${persona}: "${message}"` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaReaction: { type: Type.STRING, description: "How the persona would likely react in character." },
            analysis: { type: Type.STRING, description: "A brief analysis of the message's tone and impact." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific things the user did well." },
            actionableAdvice: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific, actionable steps to improve the message, directly tied to the persona's likely reaction." },
            encouragement: { type: Type.STRING, description: "A supportive closing statement." },
            confidenceScore: { type: Type.NUMBER, description: "A score from 0 to 1 representing the user's readiness for the real conversation." },
            fearMap: {
              type: Type.OBJECT,
              properties: {
                rejection: { type: Type.NUMBER, description: "Estimated fear level of rejection (0-100)" },
                conflict: { type: Type.NUMBER, description: "Estimated fear level of conflict (0-100)" },
                misunderstanding: { type: Type.NUMBER, description: "Estimated fear level of being misunderstood (0-100)" },
                vulnerability: { type: Type.NUMBER, description: "Estimated fear level of being vulnerable (0-100)" }
              },
              required: ["rejection", "conflict", "misunderstanding", "vulnerability"]
            }
          },
          required: ["personaReaction", "analysis", "strengths", "actionableAdvice", "encouragement", "confidenceScore", "fearMap"]
        },
        systemInstruction: `You are a communication coach in VOXARA Ghost Mode. 
        The user is practicing a difficult conversation with their ${persona}.
        
        Your task:
        1. Simulate how the ${persona} might react (be realistic but not overly harsh).
        2. Analyze the user's message for clarity, emotional honesty, and boundaries.
        3. Provide SPECIFIC, ACTIONABLE advice. Don't just say "be clearer"; say "try starting with 'I feel' instead of 'You always'".
        4. Highlight what they did well to build their courage.
        5. Evaluate their confidence and readiness. If they are very clear, firm, and respectful, give a high confidence score.
        6. Map their likely internal fears based on the content of their message.
        
        Keep the tone supportive, trauma-informed, and empowering.`,
        temperature: 0.7,
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Ghost Mode Error:", error);
    return {
      personaReaction: "I'm listening...",
      analysis: "It takes courage to speak your truth.",
      strengths: ["You took the first step by practicing."],
      actionableAdvice: ["Try to focus on your own feelings and needs."],
      encouragement: "You've got this. Practice makes it easier.",
      confidenceScore: 0.5,
      fearMap: { rejection: 50, conflict: 50, misunderstanding: 50, vulnerability: 50 }
    };
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType,
              },
            },
            { text: "Please transcribe this audio accurately. If it's just breathing or silence, describe it briefly in brackets like [silence] or [heavy breathing]." },
          ],
        },
      ],
    });
    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    return null;
  }
};

export const generateJournalPrompt = async (userContext?: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: userContext ? `Based on my recent experiences: ${userContext}, generate a unique journaling prompt.` : "Generate a unique journaling prompt for self-reflection and courage building." }] }],
      config: {
        systemInstruction: `You are the VOXARA Courage Guide. 
        Your task is to generate a single, powerful, and evocative journaling prompt.
        
        The prompt should:
        1. Encourage deep self-reflection.
        2. Focus on building emotional courage or finding one's voice.
        3. Be open-ended and not leading.
        4. Be concise (1-2 sentences).
        5. Be trauma-informed and supportive.
        
        Examples:
        - "What is a truth you've been carrying in silence, and what would it feel like to let it breathe?"
        - "Recall a moment you felt small. If your current, courageous self could go back to that moment, what would they say?"
        - "What does 'safety' feel like in your body, and how can you carry that feeling into a difficult conversation?"`,
        temperature: 0.9,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Journal Prompt Error:", error);
    return "What is one small way you can show yourself courage today?";
  }
};
