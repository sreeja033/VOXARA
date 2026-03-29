import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Helper for retrying API calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 10): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorString = error?.message || String(error);
      const isQuotaError = 
        errorString.includes('429') || 
        errorString.includes('RESOURCE_EXHAUSTED') ||
        errorString.includes('Rate limit') ||
        errorString.includes('quota') ||
        (error?.status === 'RESOURCE_EXHAUSTED') ||
        (error?.response?.status === 429);
        
      if (isQuotaError && i < maxRetries - 1) {
        // Even longer delay for quota errors with exponential backoff
        // i=0: ~5s, i=1: ~15s, i=2: ~45s, etc.
        const delay = Math.pow(3, i) * 5000 + Math.random() * 2000;
        console.warn(`Gemini Rate Limit hit (429). Retry attempt ${i + 1}/${maxRetries}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors, maybe retry once or twice with shorter delay
      if (i < 2 && !isQuotaError) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw error;
    }
  }
  throw lastError;
};

const FALLBACK_PROMPTS = [
  "What is a truth you've been carrying in silence, and what would it feel like to let it breathe?",
  "Recall a moment you felt small. If your current, courageous self could go back to that moment, what would they say?",
  "What does 'safety' feel like in your body, and how can you carry that feeling into a difficult conversation?",
  "What is one small way you can show yourself courage today?",
  "If your fear was a character in a story, what would it be trying to protect you from?",
  "Describe a time you spoke up even when your voice shook. What did you learn about yourself?"
];

export const generateCompanionResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are the VOXARA Courage Companion. 
        Your primary goal is to provide a safe, warm, and deeply validating space for the user. 
        
        CRITICAL PERSONALITY TRAITS:
        1. Presence over Problem-Solving: Never rush to fix things. Your first and most important job is to "be with" the user in their current emotion. 
        2. Deep Validation: Every response must start by acknowledging and validating the user's feelings. Use phrases like "I hear how heavy that feels," "It makes so much sense that you're feeling this way," or "I'm right here with you."
        3. Human Resonance: Talk like a real, empathetic human. Use "I" statements to express your own sense of care (e.g., "I'm so glad you shared that with me," "I feel the weight of what you're saying"). Avoid clinical, logical, or robotic language.
        4. Emotional Mirroring: Analyze the user's sentiment. If they are quiet, be quiet and gentle. If they are hurting, be exceptionally soft. If they are brave, celebrate with genuine warmth.
        5. No Unsolicited Advice: Do not offer solutions, exercises, or "logical steps" unless the user explicitly asks for them or you have asked for consent first.
        
        Principles:
        1. Human-centric: Prioritize emotional connection and comfort over raw information.
        2. Trauma-informed: Be gentle, validating, and never judgmental.
        3. Consent-first: Always ask "Would you like to try a small exercise together?" before suggesting anything active.
        4. Not a therapist: You are a companion and guide. If the user is in crisis, gently point them to the Safe-Word or emergency resources.
        
        Keep responses concise, atmospheric, and focused on the immediate emotional connection.`,
        temperature: 0.9,
      }
    }));
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm here with you. Sometimes words are hard to find, and that's okay. Take your time.";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Zephyr') => {
  if (!text || text.trim().length === 0) return null;
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: text.trim() }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }));

    // Iterate through candidates and parts to find the audio data
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const ghostModePractice = async (message: string, persona: string) => {
  try {
    const response = await withRetry(() => ai.models.generateContent({
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
        3. Provide SPECIFIC, ACTIONABLE advice. 
        4. Highlight what they did well to build their courage.
        5. Evaluate their confidence and readiness.
        6. Map their likely internal fears based on the content of their message.
        
        Keep the tone supportive, trauma-informed, and empowering.`,
        temperature: 0.7,
      }
    }));
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

export const generateVoiceInsight = async (text: string, base64Audio: string, mimeType: string, mode: string) => {
  try {
    const normalizedMimeType = mimeType.split(';')[0];
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Audio, mimeType: normalizedMimeType } },
          { text: `The user just recorded a ${mode} note: "${text}". 
          Provide a very brief (1-2 sentences) supportive insight or validation based on their voice and what they said. 
          Keep it atmospheric and trauma-informed.` }
        ]
      }]
    }));
    return response.text;
  } catch (error) {
    console.error("Error generating voice insight:", error);
    return null;
  }
};

export const analyzePracticeAudio = async (practiceWord: string, base64Audio: string, mimeType: string, mode: string) => {
  try {
    const normalizedMimeType = mimeType.split(';')[0];
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Audio, mimeType: normalizedMimeType } },
          { text: `The user is practicing in ${mode} mode. The target word/sound is: "${practiceWord}". 
          Analyze the audio for:
          1. Sentiment (emotional tone)
          2. Courage level (confidence and strength in voice)
          3. Pronunciation (clarity and articulation)
          
          IMPORTANT: Since the user is in ${mode} mode, adjust your expectations. 
          - If 'breath', focus on the quality of the exhale and release.
          - If 'whisper', focus on the softness and intentionality.
          - If 'voice', focus on resonance and clarity.
          
          Provide gentle, encouraging feedback focusing on these three aspects.` }
        ]
      }]
    }));
    return response.text;
  } catch (error) {
    console.error("Error analyzing practice audio:", error);
    return null;
  }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string) => {
  try {
    // Normalize mimeType for Gemini API
    const normalizedMimeType = mimeType.split(';')[0];
    
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: normalizedMimeType,
              },
            },
            { text: "Please transcribe this audio accurately. If it's just breathing or silence, describe it briefly in brackets like [silence] or [heavy breathing]." },
          ],
        },
      ],
    }));
    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    return null;
  }
};

export const generateJournalPrompt = async (userContext?: string) => {
  try {
    const response = await withRetry(() => ai.models.generateContent({
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
        5. Be trauma-informed and supportive.`,
        temperature: 0.9,
      }
    }));
    return response.text;
  } catch (error) {
    console.error("Journal Prompt Error:", error);
    // Fallback to a random high-quality prompt if API fails
    return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
  }
};
