export interface JournalEntry {
  id: string;
  timestamp: number;
  prompt: string;
  response: string;
  mood?: string;
}

export interface UserGoal {
  id: string;
  text: string;
  completed: boolean;
  category: 'mental-health' | 'courage' | 'social' | 'other';
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface VoiceGroup {
  id: string;
  name: string;
  description: string;
  members: string[]; // User IDs
}

export interface CourageHistoryEntry {
  timestamp: number;
  level: number;
  rejection: number;
  conflict: number;
  misunderstanding: number;
  vulnerability: number;
}

export interface DailyRitual {
  id: string;
  text: string;
  completed: boolean;
  timestamp?: number;
}

export interface MoodEntry {
  timestamp: number;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  note?: string;
}

export interface Affirmation {
  id: string;
  text: string;
  timestamp: number;
  audioData?: string; // Optional base64 audio
}

export interface SocialEnergyEntry {
  timestamp: number;
  energyLevel: number; // 0 to 100, where 0 is drained and 100 is full
  activity?: string;
  note?: string;
}

export interface AvoidanceEntry {
  id: string;
  timestamp: number;
  situation: string;
  count: number; // How many times this specific situation was avoided
  lastAvoided: number;
}

export interface FutureSelfDialogueEntry {
  id: string;
  timestamp: number;
  messages: { role: 'user' | 'model'; text: string; timestamp: number }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  courageLevel: number; // 0 to 100
  safeWord: string;
  voiceNotes: VoiceNote[];
  dailyIntention?: string;
  journalEntries?: JournalEntry[];
  goals?: UserGoal[];
  emergencyContacts?: EmergencyContact[];
  groups?: string[];
  courageHistory?: CourageHistoryEntry[];
  dailyRituals?: DailyRitual[];
  moodHistory?: MoodEntry[];
  hasCompletedSafetyOnboarding?: boolean;
  socialEnergyHistory?: SocialEnergyEntry[];
  avoidanceHistory?: AvoidanceEntry[];
  futureSelfDialogueHistory?: FutureSelfDialogueEntry[];
}

export type AppState = 'landing' | 'auth' | 'home' | 'dashboard' | 'whisper' | 'companion' | 'map' | 'circles' | 'presence' | 'bridge' | 'simulation' | 'echo' | 'anchor' | 'exit' | 'emergency' | 'connections' | 'journal' | 'settings' | 'meditations' | 'rituals' | 'calm' | 'mood' | 'safety-onboarding' | 'notifications' | 'help' | 'energy' | 'avoidance' | 'future-self';

export interface VoiceNote {
  id: string;
  timestamp: number;
  duration: number;
  type: 'breath' | 'whisper' | 'voice' | 'companion';
  isPrivate: boolean;
  text?: string;
  audioData?: string;
}
