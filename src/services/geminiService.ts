import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Global cooldown to prevent rapid-fire requests
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 1000; // 1 second gap between requests

// Simple cache for TTS to avoid redundant calls
const ttsCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

const emitApiStatus = (status: 'idle' | 'busy' | 'error' | 'retry') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gemini-api-status', { detail: status }));
  }
};

// Helper for retrying API calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  emitApiStatus('busy');
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Enforce minimum gap between requests
      const now = Date.now();
      const timeSinceLast = now - lastRequestTime;
      if (timeSinceLast < MIN_REQUEST_GAP) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP - timeSinceLast));
      }
      
      const result = await fn();
      lastRequestTime = Date.now();
      emitApiStatus('idle');
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Check for quota/rate limit errors in various formats
      const errorMessage = error?.message || '';
      const errorStatus = error?.status || '';
      const responseStatus = error?.response?.status;
      
      const isQuotaError = 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota') ||
        errorStatus === 'RESOURCE_EXHAUSTED' ||
        responseStatus === 429;
        
      if (isQuotaError && i < maxRetries - 1) {
        emitApiStatus('retry');
        // More aggressive backoff for quota errors
        // i=0: ~5s, i=1: ~15s, i=2: ~45s, i=3: ~135s
        const delay = Math.pow(3, i) * 5000 + Math.random() * 2000;
        console.warn(`Gemini Rate Limit hit (429). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      emitApiStatus('error');
      // If it's a quota error and we've exhausted retries, throw a clearer error
      if (isQuotaError) {
        throw new Error("VOXARA is currently resting. Our AI companion is experiencing high demand. Please try again in a few minutes.");
      }
      
      throw error;
    }
  }
  emitApiStatus('idle');
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
  
  const cacheKey = `${voiceName}:${text.trim()}`;
  if (ttsCache.has(cacheKey)) {
    return ttsCache.get(cacheKey);
  }
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      // Manage cache size
      if (ttsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, base64Audio);
    }
    
    return base64Audio;
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

export const generateWhisperFeedback = async (base64Audio: string, mimeType: string, mode: string, practiceWord: string) => {
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
    console.error("Whisper Feedback Error:", error);
    return "I heard you. It takes courage to practice like this. Keep going.";
  }
};

export const generateWhisperInsight = async (base64Audio: string, mimeType: string, mode: string, text: string) => {
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
    console.error("Whisper Insight Error:", error);
    return "Your voice is important. Thank you for sharing this moment.";
  }
};
