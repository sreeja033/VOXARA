export interface LiveSessionEntry {
  id: string;
  timestamp: number;
  messages: { role: 'user' | 'model'; text: string; timestamp: number }[];
}

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

export interface User {
  id: string;
  name: string;
  email: string;
  courageLevel: number; // 0 to 100
  safeWord: string;
  voiceNotes: VoiceNote[];
  dailyIntention?: string;
  liveHistory?: LiveSessionEntry[];
  journalEntries?: JournalEntry[];
  bio?: string;
  goals?: UserGoal[];
  location?: string;
  emergencyContacts?: EmergencyContact[];
  groups?: string[]; // Group IDs
  courageHistory?: CourageHistoryEntry[];
  locationEnabled?: boolean;
  dailyRituals?: DailyRitual[];
  moodHistory?: MoodEntry[];
  hasCompletedSafetyOnboarding?: boolean;
}

export type AppState = 'landing' | 'auth' | 'dashboard' | 'whisper' | 'companion' | 'map' | 'circles' | 'presence' | 'bridge' | 'simulation' | 'echo' | 'live' | 'anchor' | 'exit' | 'emergency' | 'connections' | 'journal' | 'settings' | 'affirmations' | 'meditations' | 'rituals' | 'calm' | 'mood' | 'safety-onboarding';

export interface VoiceNote {
  id: string;
  timestamp: number;
  duration: number;
  type: 'breath' | 'whisper' | 'voice' | 'companion';
  isPrivate: boolean;
  text?: string;
  audioData?: string;
}
