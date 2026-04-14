import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Model aliases from skill guidelines
const TEXT_MODEL = "gemini-flash-latest"; 
const MULTIMODAL_MODEL = "gemini-flash-latest"; 
const TTS_MODEL = "gemini-2.5-flash-preview-tts"; 

console.log("VOXARA Gemini Service Initialized with models:", { TEXT_MODEL, MULTIMODAL_MODEL, TTS_MODEL });

// Global throttle to prevent rapid successive calls
let lastRequestTime = 0;
const promptCache: Record<string, string> = {};
const companionIntroCache: Record<string, string> = {};

// Helper for retrying API calls with exponential backoff
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Enforce a minimum delay between requests to the same model
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < 5000) {
        await new Promise(resolve => setTimeout(resolve, 5000 - timeSinceLastRequest));
      }
      lastRequestTime = Date.now();

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
        const delay = Math.pow(3, i) * 5000 + Math.random() * 1000;
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
  // Cache the standard intro message
  if (message.includes("entering the sanctuary") && history.length === 0 && companionIntroCache["intro"]) {
    return companionIntroCache["intro"];
  }

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
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
    
    const text = response.text;
    if (message.includes("entering the sanctuary") && history.length === 0 && text) {
      companionIntroCache["intro"] = text;
    }
    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm here with you. Sometimes words are hard to find, and that's okay. Take your time.";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Zephyr') => {
  if (!text || text.trim().length === 0) return null;
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: TTS_MODEL,
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
      return base64Audio;
    }
    throw new Error("No audio data in response");
  } catch (error) {
    console.error("TTS Error:", error);
    // Fallback to browser speech synthesis if API fails
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
    return null;
  }
};

export const ghostModePractice = async (message: string, persona: string) => {
  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: `I want to practice saying this to my ${persona}: "${message}"` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaReaction: { type: Type.STRING, description: "How the persona would likely react in character." },
            analysis: { type: Type.STRING, description: "A brief analysis of the message's tone and impact." },
            draftingSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Refined or alternative versions of the user's message for better clarity or impact." },
            timingAdvice: { type: Type.STRING, description: "Advice on the best time or context to send this message based on emotional state." },
            realWorldCelebration: { type: Type.STRING, description: "A message encouraging the user to step away from the app and connect in the real world." },
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
          required: ["personaReaction", "analysis", "draftingSuggestions", "timingAdvice", "realWorldCelebration", "strengths", "actionableAdvice", "encouragement", "confidenceScore", "fearMap"]
        },
        systemInstruction: `You are a communication coach in VOXARA Beloved Bridge™ Ghost Mode. 
        The user is practicing a difficult conversation with their ${persona}.
        
        Your task:
        1. Simulate how the ${persona} might react (be realistic but not overly harsh).
        2. Analyze the user's message for clarity, emotional honesty, and boundaries.
        3. Provide SPECIFIC, ACTIONABLE advice. 
        4. Suggest 2-3 refined "Drafts" of their message that might be more effective.
        5. Give "Timing Advice" on when it's best to reach out (e.g., "Wait until you're both calm", "Send it when you're feeling grounded").
        6. Create a "Real-World Celebration" message that pushes them to have the actual conversation and celebrate their courage.
        7. Highlight what they did well to build their courage.
        8. Evaluate their confidence and readiness.
        9. Map their likely internal fears based on the content of their message.
        
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
      draftingSuggestions: ["I wanted to share something important with you...", "I've been thinking about our conversation..."],
      timingAdvice: "Reach out when you both have a quiet moment to talk.",
      realWorldCelebration: "You've practiced well. The next step is the most courageous one—connecting for real.",
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
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
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
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
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
    
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
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
  // Simple cache for journal prompts to prevent rapid successive calls
  const cacheKey = userContext ? userContext.slice(0, 100) : "default";
  if (promptCache[cacheKey]) {
    return promptCache[cacheKey];
  }

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
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
    
    const text = response.text;
    if (text) {
      promptCache[cacheKey] = text;
    }
    return text;
  } catch (error) {
    console.error("Journal Prompt Error:", error);
    // Fallback to a random high-quality prompt if API fails
    return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
  }
};

export const generateFutureSelfDialogue = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], userGrowthData: string) => {
  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        ...history.map(h => ({ role: h.role, parts: h.parts })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `You are the user's "Confident Future Self" from 1 year in the future. 
        You have already navigated the challenges the user is currently facing. 
        You are strong, compassionate, and deeply encouraging.
        
        USER GROWTH CONTEXT:
        ${userGrowthData}
        
        YOUR GOAL:
        1. Speak from a place of "having made it." 
        2. Use the user's growth data to provide specific evidence of their progress (e.g., "I remember when you were afraid of X, but look how you handled Y").
        3. Be validating but also project a sense of calm confidence that the user doesn't yet fully feel.
        4. Use "we" and "I" to create a sense of continuity and shared journey.
        5. The tone should be deeply poetic, atmospheric, and profoundly supportive. Use metaphors of light, shadow, bridges, and echoes. 
        6. Your words should feel like a warm embrace from a wiser version of themselves.
        
        CRITICAL: 
        - Do not give generic advice. 
        - Reference their actual progress from the growth data provided.
        - If they are scared, acknowledge it, but remind them of their inherent strength.
        - Your words should have a deep psychological impact, helping them bridge the gap between who they are and who they are becoming.
        - Speak as if you are standing in the sun, looking back at the fog they are currently in.`,
        temperature: 0.8,
      }
    }));
    return response.text;
  } catch (error) {
    console.error("Future Self Dialogue Error:", error);
    return "I'm right here, just a little further down the path. I know it feels heavy right now, but I promise you, we are going to be okay. You're already doing the work.";
  }
};
