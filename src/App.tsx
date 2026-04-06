import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check,
  Quote,
  Mic, 
  Heart, 
  Map as MapIcon, 
  Users, 
  Waypoints as Bridge, 
  Shield, 
  Wind, 
  Activity, 
  ArrowRight, 
  Volume2, 
  VolumeX,
  X,
  MessageSquare,
  LogOut,
  ChevronRight,
  Play,
  Square,
  Sparkles,
  Save,
  Send,
  User as UserIcon,
  Settings,
  MicOff,
  CloudFog,
  Cloud,
  Sun,
  History,
  DoorOpen,
  AlertTriangle,
  AlertCircle,
  Zap,
  Handshake,
  CloudRain,
  TreePine,
  Waves,
  Smile,
  Frown,
  Meh,
  RotateCcw,
  BookOpen,
  Plus,
  Phone,
  TrendingUp,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Navigation,
  TrendingDown,
  CloudSun,
  CloudLightning,
  Home as HomeIcon,
  Radio,
  Trash2,
  Moon,
  Bell,
  HelpCircle,
  BarChart2,
  Ghost,
  Clock,
  Copy,
  Hand,
  Utensils
} from 'lucide-react';
import { AppState, User, VoiceNote, JournalEntry, UserGoal, EmergencyContact, CourageHistoryEntry, MoodEntry, SocialEnergyEntry, AvoidanceEntry, FutureSelfDialogueEntry } from './types';
import { generateCompanionResponse, ghostModePractice, generateSpeech, transcribeAudio, generateJournalPrompt, generateVoiceInsight, analyzePracticeAudio, generateFutureSelfDialogue } from './services/geminiService';
import { playPCM } from './utils/audioUtils';
import { signUp, logIn, logOut, subscribeToAuthChanges } from './services/authService';
import { getUserData, saveUserData } from './services/userService';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { useMotionValue, useTransform, useSpring } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import Markdown from 'react-markdown';

const MicPermissionCheck = () => {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setStatus(result.state as any);
        result.onchange = () => setStatus(result.state as any);
      } catch (err) {
        // Fallback for browsers that don't support permissions.query for mic
        setStatus('prompt');
      }
    };
    checkPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setStatus('granted');
    } catch (err) {
      setStatus('denied');
    }
  };

  if (status === 'granted') {
    return (
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-vox-accent font-bold bg-vox-accent/10 px-3 py-1.5 rounded-full border border-vox-accent/20">
        <Mic size={12} />
        <span>Mic Ready</span>
      </div>
    );
  }

  return (
    <button 
      onClick={requestPermission}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border transition-all ${
        status === 'denied' 
          ? 'text-red-400 bg-red-400/10 border-red-400/20' 
          : 'text-vox-paper/40 bg-white/5 border-white/10 hover:bg-vox-accent/10 hover:text-vox-accent hover:border-vox-accent/20'
      }`}
    >
      {status === 'denied' ? <MicOff size={12} /> : <Mic size={12} />}
      <span>{status === 'denied' ? 'Mic Blocked' : 'Enable Mic'}</span>
    </button>
  );
};

// --- New Feature Components ---

const DailyRituals = ({ user, setUser, onBack }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void }) => {
  const rituals = user.dailyRituals || [];

  const toggleRitual = (id: string) => {
    const updated = rituals.map(r => r.id === id ? { ...r, completed: !r.completed, timestamp: Date.now() } : r);
    setUser(prev => prev ? ({ ...prev, dailyRituals: updated }) : null);
    
    // If all completed, maybe give a small courage boost
    if (updated.every(r => r.completed)) {
      setUser(prev => prev ? ({ ...prev, courageLevel: Math.min(100, prev.courageLevel + 2) }) : null);
    }
  };

  const resetRituals = () => {
    const updated = rituals.map(r => ({ ...r, completed: false, timestamp: undefined }));
    setUser(prev => prev ? ({ ...prev, dailyRituals: updated }) : null);
  };

  const completedCount = rituals.filter(r => r.completed).length;

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-16 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Daily Rituals</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-px w-8 bg-vox-accent/30" />
            <p className="text-vox-paper/40 text-[10px] uppercase tracking-[0.3em] font-bold">Speak your strength</p>
            <div className="h-px w-8 bg-vox-accent/30" />
          </div>
        </div>
        <button 
          onClick={resetRituals}
          className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/30 hover:text-vox-accent"
          title="Reset Rituals"
        >
          <RotateCcw size={20} />
        </button>
      </header>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="mb-12 flex items-center justify-between px-4">
          <div className="text-sm font-serif italic text-vox-paper/60">
            {completedCount === rituals.length ? "Your spirit is fortified." : `${completedCount} of ${rituals.length} rituals observed.`}
          </div>
          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / rituals.length) * 100}%` }}
              className="h-full bg-vox-accent shadow-[0_0_10px_rgba(45,212,191,0.5)]"
            />
          </div>
        </div>

        <div className="space-y-6">
          {rituals.map((ritual, idx) => (
            <motion.div 
              key={ritual.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer group relative overflow-hidden ${
                ritual.completed 
                  ? 'bg-vox-accent/5 border-vox-accent/20' 
                  : 'bg-[#0a0a0a]/40 border-white/5 hover:border-vox-accent/20'
              }`}
              onClick={() => toggleRitual(ritual.id)}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-500 ${
                    ritual.completed 
                      ? 'bg-vox-accent text-vox-bg border-vox-accent scale-110 shadow-[0_0_20px_rgba(45,212,191,0.3)]' 
                      : 'bg-white/5 border-white/10 group-hover:border-vox-accent/40'
                  }`}>
                    {ritual.completed ? <Check size={24} strokeWidth={3} /> : <Mic size={24} className="text-vox-paper/20 group-hover:text-vox-accent transition-colors" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-2xl font-serif italic transition-all duration-500 ${ritual.completed ? 'text-white' : 'text-vox-paper/60'}`}>
                      "{ritual.text}"
                    </span>
                    {ritual.completed && (
                      <span className="text-[10px] uppercase tracking-widest text-vox-accent mt-2 font-bold opacity-60">Observed</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Subtle animated background for completed items */}
              {ritual.completed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-vox-accent/10 via-transparent to-transparent pointer-events-none"
                />
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <p className="text-vox-paper/20 text-sm font-serif italic max-w-sm mx-auto leading-relaxed">
            "The words we speak to ourselves become the house we live in. Build a sanctuary of courage."
          </p>
        </div>
      </div>
    </div>
  );
};

const SafetyOnboarding = ({ user, setUser, onComplete }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [safeWord, setSafeWord] = useState(user.safeWord || '');
  const [contacts, setContacts] = useState<EmergencyContact[]>(user.emergencyContacts || []);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleAddContact = () => {
    if (newContactName && newContactPhone) {
      const newContact: EmergencyContact = {
        id: Math.random().toString(36).substr(2, 9),
        name: newContactName,
        phone: newContactPhone
      };
      setContacts([...contacts, newContact]);
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleFinish = () => {
    setUser(prev => prev ? ({
      ...prev,
      safeWord,
      emergencyContacts: contacts,
      hasCompletedSafetyOnboarding: true
    }) : null);
    onComplete();
  };

  const steps = [
    {
      title: "Your Safety Sanctuary",
      description: "Voxara is a space for courage, but safety is our foundation. Let's set up your protection protocols.",
      why: "Establishing a safety net allows you to explore your voice with full confidence, knowing support is always within reach.",
      icon: Shield,
      color: "text-vox-accent"
    },
    {
      title: "The Safe Word",
      description: "Choose a word or phrase that, when spoken, immediately activates 'Anchor Mode'—a high-security, grounding state.",
      why: "In moments of overwhelm, a simple word can trigger immediate grounding exercises and discreetly alert your support system.",
      icon: Lock,
      color: "text-emerald-400"
    },
    {
      title: "Emergency Circle",
      description: "If your courage levels drop critically, we can discreetly notify your trusted circle. Add at least one contact.",
      why: "Your journey isn't meant to be walked alone. Having a trusted circle ensures you're never truly isolated in difficult moments.",
      icon: Users,
      color: "text-blue-400"
    }
  ];

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl w-full glass-dark p-12 rounded-[3rem] border border-white/10 relative z-10 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 ${steps[step].color}`}
            >
              {React.createElement(steps[step].icon, { size: 40 })}
            </motion.div>
            
            <h2 className="text-4xl font-light tracking-tighter mb-4 text-white">{steps[step].title}</h2>
            <p className="text-vox-paper/60 font-serif italic text-lg mb-6 leading-relaxed">
              {steps[step].description}
            </p>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 rounded-2xl p-4 mb-10 border border-white/5"
            >
              <p className="text-[10px] uppercase tracking-widest text-vox-accent font-bold mb-1">Why this matters</p>
              <p className="text-xs text-vox-paper/40 leading-relaxed italic">"{steps[step].why}"</p>
            </motion.div>

            {step === 1 && (
              <div className="w-full space-y-4 mb-10">
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 text-left ml-4">Your Safe Word</label>
                <input 
                  type="text"
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value)}
                  placeholder="e.g. Blue Spruce"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-vox-accent transition-colors text-center"
                />
              </div>
            )}

            {step === 2 && (
              <div className="w-full space-y-6 mb-10">
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-left">
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-vox-paper/40">{contact.phone}</p>
                      </div>
                      <button onClick={() => handleRemoveContact(contact.id)} className="text-vox-paper/20 hover:text-red-400 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="Name"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent"
                  />
                  <input 
                    type="text"
                    placeholder="Phone"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent"
                  />
                </div>
                <button 
                  onClick={handleAddContact}
                  disabled={!newContactName || !newContactPhone}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-30"
                >
                  Add Contact
                </button>
              </div>
            )}

            <div className="flex gap-4 w-full">
              {step > 0 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Back
                </button>
              )}
              <button 
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : handleFinish()}
                disabled={step === 1 && !safeWord}
                className="flex-[2] py-4 bg-vox-accent text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-vox-accent/20"
              >
                {step === steps.length - 1 ? "Complete Setup" : "Continue"}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 flex gap-2">
        {steps.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-vox-accent' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
};

const VoxaraLogo = ({ className = "w-12 h-12" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Curved Base */}
    <path d="M10 90C30 75 70 75 90 90" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" />
    
    {/* Left Person */}
    <g transform="translate(15, 45) scale(0.8)">
      <circle cx="10" cy="5" r="5" fill="#3b82f6" />
      <path d="M0 25C0 15 20 15 20 25L15 40L5 40Z" fill="#3b82f6" opacity="0.8" />
      <path d="M5 15L-5 5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15L25 5" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Right Person */}
    <g transform="translate(65, 45) scale(0.8)">
      <circle cx="10" cy="5" r="5" fill="#f97316" />
      <path d="M0 25C0 15 20 15 20 25L15 40L5 40Z" fill="#f97316" opacity="0.8" />
      <path d="M5 15L-5 5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 15L25 5" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Center Microphone */}
    <g transform="translate(40, 20)">
      <rect x="5" y="0" width="10" height="20" rx="5" fill="#d97706" />
      <path d="M0 10C0 20 20 20 20 10" stroke="#d97706" strokeWidth="2" fill="none" />
      <line x1="10" y1="20" x2="10" y2="25" stroke="#d97706" strokeWidth="2" />
      <line x1="5" y1="25" x2="15" y2="25" stroke="#d97706" strokeWidth="2" />
      
      {/* Sound Waves */}
      <path d="M-5 5C-8 8 -8 12 -5 15" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M-10 0C-15 5 -15 15 -10 20" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </path>
      
      <path d="M25 5C28 8 28 12 25 15" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M30 0C35 5 35 15 30 20" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.8;0.1" dur="2s" repeatCount="indefinite" begin="0.5s" />
      </path>
    </g>

    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="0">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
    </defs>
  </svg>
);

const BoxBreathing = () => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold '>('Inhale');
  const [timeLeft, setTimeLeft] = useState(4);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      const phases: ('Inhale' | 'Hold' | 'Exhale' | 'Hold ')[] = ['Inhale', 'Hold', 'Exhale', 'Hold '];
      const currentIndex = phases.indexOf(phase);
      const nextIndex = (currentIndex + 1) % phases.length;
      setPhase(phases[nextIndex]);
      setTimeLeft(4);
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, phase]);

  return (
    <div className="w-full mt-6 flex flex-col items-center">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Pulsating Ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              key={phase + timeLeft}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-vox-accent/30"
            />
          )}
        </AnimatePresence>

        {/* Outer Circle (Progress) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle 
            cx="100" cy="100" r="90" 
            className="stroke-white/5 fill-none" 
            strokeWidth="4"
          />
          <motion.circle 
            cx="100" cy="100" r="90" 
            className="stroke-vox-accent fill-none" 
            strokeWidth="4"
            strokeDasharray="565.48"
            animate={{ strokeDashoffset: 565.48 * (1 - timeLeft / 4) }}
            transition={{ duration: 1, ease: "linear" }}
            strokeLinecap="round"
          />
        </svg>

        <motion.div 
          animate={{ 
            scale: phase === 'Inhale' ? [1, 1.3] : phase === 'Exhale' ? [1.3, 1] : phase === 'Hold' ? 1.3 : 1
          }}
          transition={{ duration: 4, ease: "linear" }}
          className="absolute inset-4 rounded-full border-2 border-vox-accent/30 bg-vox-accent/5 flex items-center justify-center"
        >
          <div className="text-center z-10">
            <motion.div 
              key={timeLeft}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-vox-accent font-bold text-4xl mb-1"
            >
              {timeLeft}
            </motion.div>
            <div className="text-vox-paper/60 text-[10px] uppercase tracking-widest">{phase}</div>
          </div>
        </motion.div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
        className="mt-8 px-6 py-2 rounded-full bg-vox-accent/20 border border-vox-accent/30 text-vox-accent text-xs font-bold uppercase tracking-widest hover:bg-vox-accent/30 transition-all"
      >
        {isActive ? 'Pause' : 'Start Ritual'}
      </button>
    </div>
  );
};

const MuscleRelaxation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTense, setIsTense] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  const steps = [
    'Toes & Feet',
    'Calves',
    'Thighs',
    'Glutes',
    'Abdomen',
    'Hands & Arms',
    'Shoulders',
    'Face & Jaw'
  ];

  useEffect(() => {
    let timer: any;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        // Subtle haptic feedback every second during tension
        if (isTense && 'vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (!isTense) {
        // Transition to Tense
        setIsTense(true);
        setTimeLeft(5);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      } else {
        // Transition to Release
        setIsTense(false);
        setTimeLeft(5);
        if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]); // Subtle release pulse
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          setIsActive(false);
          setCurrentStep(0);
        }
      }
    }
    return () => clearInterval(timer);
  }, [isActive, timeLeft, isTense, currentStep]);

  return (
    <div className="w-full mt-6 flex flex-col items-center">
      <div className="text-center mb-6">
        <div className="text-vox-paper/40 text-[10px] uppercase tracking-widest mb-2">Current Area</div>
        <div className="text-xl font-serif italic text-white">{steps[currentStep]}</div>
      </div>
      
      <div className="relative w-full h-12 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div 
          animate={{ 
            width: `${(timeLeft / 5) * 100}%`,
            backgroundColor: isTense ? 'rgba(242, 125, 38, 0.4)' : 'rgba(16, 185, 129, 0.4)'
          }}
          className="h-full"
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-white">
          {isTense ? `Tense - ${timeLeft}s` : `Release - ${timeLeft}s`}
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
        className="mt-8 px-6 py-2 rounded-full bg-vox-accent/20 border border-vox-accent/30 text-vox-accent text-xs font-bold uppercase tracking-widest hover:bg-vox-accent/30 transition-all"
      >
        {isActive ? 'Pause' : 'Start Release'}
      </button>
    </div>
  );
};

const CalmCenter = ({ onBack }: { onBack: () => void }) => {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const exercises = [
    {
      id: '54321',
      title: '5-4-3-2-1 Grounding',
      description: 'A technique to bring you back to the present moment.',
      steps: [
        'Acknowledge 5 things you see around you.',
        'Acknowledge 4 things you can touch.',
        'Acknowledge 3 things you hear.',
        'Acknowledge 2 things you can smell.',
        'Acknowledge 1 thing you can taste.'
      ],
      icon: <Eye size={24} />,
      interactive: null
    },
    {
      id: 'box',
      title: 'Box Breathing',
      description: 'Powerful tool to regulate your nervous system.',
      steps: [
        'Inhale for 4 seconds.',
        'Hold for 4 seconds.',
        'Exhale for 4 seconds.',
        'Hold for 4 seconds.',
        'Repeat 4 times.'
      ],
      icon: <Wind size={24} />,
      interactive: <BoxBreathing />
    },
    {
      id: 'muscle',
      title: 'Muscle Relaxation',
      description: 'Release physical tension from your body.',
      steps: [
        'Tense your toes for 5 seconds, then release.',
        'Tense your calves, then release.',
        'Tense your thighs, then release.',
        'Work your way up to your shoulders and face.',
        'Feel the weight of your body sinking down.'
      ],
      icon: <Activity size={24} />,
      interactive: <MuscleRelaxation />
    }
  ];

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4">
          <VoxaraLogo className="w-10 h-10" />
          <div className="text-center">
            <h2 className="text-3xl font-serif italic text-white">Calm Center</h2>
            <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-2">Anchor yourself in the storm</p>
          </div>
        </div>
        <div className="w-10" />
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {exercises.map((ex) => (
          <motion.div 
            key={ex.id}
            whileHover={{ y: -10 }}
            className={`p-8 rounded-[3rem] border transition-all cursor-pointer flex flex-col items-center text-center ${
              activeExercise === ex.id ? 'bg-vox-accent/10 border-vox-accent/30' : 'bg-[#0a0a0a]/40 border-white/5 hover:border-vox-accent/20'
            }`}
            onClick={() => setActiveExercise(ex.id)}
          >
            <div className="w-16 h-16 rounded-full bg-vox-accent/10 flex items-center justify-center mb-6 border border-vox-accent/20">
              {ex.icon}
            </div>
            <h3 className="text-xl font-serif italic text-white mb-4">{ex.title}</h3>
            <p className="text-vox-paper/40 text-sm mb-8 leading-relaxed">{ex.description}</p>
            
            <AnimatePresence>
              {activeExercise === ex.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full text-left space-y-4"
                >
                  <div className="h-px w-full bg-white/5 my-4" />
                  {ex.interactive}
                  {!ex.interactive && ex.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm text-vox-paper/60">
                      <span className="text-vox-accent font-mono">{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="mt-24 max-w-lg mx-auto bg-red-500/5 border border-red-500/10 p-8 rounded-[2rem] text-center">
        <AlertCircle className="text-red-400 mx-auto mb-4" size={32} />
        <h4 className="text-white font-serif italic text-xl mb-2">Need immediate help?</h4>
        <p className="text-vox-paper/40 text-sm mb-6">If you are in immediate danger or a crisis, please reach out to emergency services.</p>
        <button 
          onClick={() => window.location.href = 'tel:988'} // US Suicide & Crisis Lifeline
          className="px-8 py-3 bg-red-500/20 text-red-400 rounded-full border border-red-500/30 hover:bg-red-500/30 transition-all font-bold tracking-widest text-xs uppercase"
        >
          Call Lifeline
        </button>
      </div>
    </div>
  );
};

const Starfield = () => {
  const stars = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.2 + 0.3,
    opacity: Math.random() * 0.3 + 0.05,
    duration: Math.random() * 5 + 4,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#020202]">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity, star.opacity * 0.3, star.opacity],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * window.innerWidth, 
            y: Math.random() * window.innerHeight,
            opacity: Math.random() * 0.3,
            scale: Math.random() * 0.3 + 0.3
          }}
          animate={{ 
            y: [null, Math.random() * -100 - 50],
            x: [null, (Math.random() - 0.5) * 50],
            opacity: [null, 0]
          }}
          transition={{ 
            duration: Math.random() * 15 + 15, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute w-1 h-1 bg-vox-accent/50 rounded-full blur-[1px]"
        />
      ))}
    </div>
  );
};

const FeatureCard = ({ 
  title, 
  description, 
  icon: Icon, 
  image, 
  accentColor, 
  onClick, 
  label,
  className = ""
}: { 
  title: string; 
  description: string; 
  icon: any; 
  image: string; 
  accentColor: string; 
  onClick: () => void;
  label: string;
  className?: string;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { damping: 20, stiffness: 100 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { damping: 20, stiffness: 100 });

  function handleMouseMove(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    x.set(event.clientX - centerX);
    y.set(event.clientY - centerY);
    
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      onClick={onClick}
      className={`group relative rounded-[3rem] overflow-hidden border border-white/5 flex flex-col justify-end p-8 md:p-10 text-left transition-all duration-500 bg-vox-bg/40 backdrop-blur-sm ${className}`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover opacity-10 transition-all duration-1000 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vox-bg via-vox-bg/40 to-transparent" />
      </div>
      
      {/* Dynamic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-vox-bg via-vox-bg/80 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-vox-bg/40 z-10" />
      
      {/* Spotlight Effect */}
      <motion.div 
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([cx, cy]) => `radial-gradient(800px circle at ${cx}px ${cy}px, ${accentColor}10, transparent 40%)`
          )
        }}
      />

      <div className="relative z-30 w-full">
        {/* Icon Container */}
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 12 }}
          className="w-16 h-16 rounded-[2rem] flex items-center justify-center border mb-10 transition-all duration-500 shadow-lg"
          style={{ 
            backgroundColor: `${accentColor}15`,
            borderColor: `${accentColor}30`,
            boxShadow: `0 0 20px ${accentColor}10`
          }}
        >
          <Icon size={32} style={{ color: accentColor }} />
        </motion.div>
        
        <div className="mb-4">
          <span className="text-[11px] uppercase tracking-[0.4em] font-bold opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: accentColor }}>
            {label}
          </span>
        </div>
        
        <h3 className="text-5xl font-light tracking-tighter mb-4 group-hover:text-white transition-colors leading-none">
          {title}
        </h3>
        
        <p className="text-vox-paper/40 text-base leading-relaxed mb-10 max-w-[300px] group-hover:text-vox-paper/70 transition-colors font-serif italic">
          {description}
        </p>
        
        <div className="flex items-center gap-4">
          <div className="h-[1px] w-8 bg-white/10 group-hover:w-16 transition-all duration-500" style={{ backgroundColor: `${accentColor}40` }} />
          <span className="text-xs uppercase tracking-[0.2em] font-bold transition-all group-hover:translate-x-2" style={{ color: accentColor }}>
            Begin Ritual
          </span>
          <ArrowRight size={16} style={{ color: accentColor }} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500" />
        </div>
      </div>

      {/* Interactive Border Glow */}
      <div className="absolute inset-0 border border-white/5 rounded-[4rem] z-40 pointer-events-none transition-colors group-hover:border-white/10" />
    </motion.button>
  );
};
const Magnetic = ({ children, strength = 0.5 }: { children: React.ReactNode, strength?: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { damping: 20, stiffness: 150 });
  const springY = useSpring(y, { damping: 20, stiffness: 150 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * strength);
    y.set((clientY - centerY) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

const QuickActions = ({ setView }: { setView: (v: AppState) => void }) => (
  <motion.div 
    initial={{ y: 100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 glass-dark rounded-full border border-white/10 shadow-2xl"
  >
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setView('settings')}
      title="Configure your safe word and emergency settings"
      className="flex items-center gap-2 px-6 py-3 rounded-full text-red-400 font-bold text-xs uppercase tracking-widest transition-colors hover:bg-red-500/10"
    >
      <Shield size={16} /> Safe Word
    </motion.button>
    <div className="w-px h-6 bg-white/10 mx-2" />
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setView('presence')}
      title="Enter a state of mindful presence and breathing"
      className="flex items-center gap-2 px-6 py-3 rounded-full text-blue-400 font-bold text-xs uppercase tracking-widest transition-colors hover:bg-blue-500/10"
    >
      <Wind size={16} /> Presence
    </motion.button>
  </motion.div>
);

const SocialEnergyMeter = ({ user, setUser, onBack }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void }) => {
  const [energy, setEnergy] = useState(50);
  const [activity, setActivity] = useState('');
  const [note, setNote] = useState('');

  const handleLogEnergy = () => {
    const newEntry: SocialEnergyEntry = {
      timestamp: Date.now(),
      energyLevel: energy,
      activity: activity || undefined,
      note: note || undefined
    };

    setUser(prev => prev ? ({
      ...prev,
      socialEnergyHistory: [newEntry, ...(prev.socialEnergyHistory || [])]
    }) : null);

    setActivity('');
    setNote('');
  };

  const getSuggestion = (level: number) => {
    if (level < 30) return { text: "Take rest. Your social battery is critically low. It's okay to decline invitations today.", icon: Moon };
    if (level < 60) return { text: "Try a small interaction tomorrow. Maybe just a text or a short call.", icon: MessageSquare };
    return { text: "You have some energy! This is a good time for a meaningful conversation.", icon: Zap };
  };

  const suggestion = getSuggestion(energy);

  const chartData = (user.socialEnergyHistory || [])
    .slice(0, 7)
    .reverse()
    .map(entry => ({
      time: new Date(entry.timestamp).toLocaleDateString(),
      level: entry.energyLevel
    }));

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden">
      <FloatingParticles />
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-16 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Social Energy Meter</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Manage your battery, not just your courage</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        <div className="space-y-8">
          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-2xl font-serif italic text-white mb-8">How do you feel now?</h3>
            
            <div className="space-y-12">
              <div className="relative pt-10">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-vox-paper/40 mb-4 font-bold">
                  <span>Drained</span>
                  <span>Radiant</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={energy} 
                  onChange={(e) => setEnergy(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-vox-accent"
                />
                <motion.div 
                  style={{ left: `${energy}%` }}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                >
                  <div className="text-2xl font-bold text-vox-accent mb-1">{energy}%</div>
                  <div className="w-4 h-4 rounded-full bg-vox-accent shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                </motion.div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="What drained/charged you? (e.g. Work meeting)"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-vox-accent transition-colors"
                />
                <textarea 
                  placeholder="Any specific notes..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-vox-accent transition-colors h-24 resize-none"
                />
              </div>

              <button 
                onClick={handleLogEnergy}
                className="w-full py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-vox-accent/20"
              >
                Log Energy Level
              </button>
            </div>
          </div>

          <motion.div 
            key={energy}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-dark p-8 rounded-[2.5rem] border border-vox-accent/20 bg-vox-accent/5"
          >
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 rounded-2xl bg-vox-accent/20 flex items-center justify-center text-vox-accent shrink-0">
                <suggestion.icon size={24} />
              </div>
              <div>
                <h4 className="text-vox-accent text-[10px] uppercase tracking-widest font-bold mb-2">Energy Insight</h4>
                <p className="text-white font-serif italic text-lg leading-relaxed">
                  {suggestion.text}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-8">
          <div className="glass-dark p-10 rounded-[3rem] border border-white/5 h-full">
            <h3 className="text-2xl font-serif italic text-white mb-8">Energy Trends</h3>
            
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                      itemStyle={{ color: '#2dd4bf' }}
                    />
                    <Area type="monotone" dataKey="level" stroke="#2dd4bf" fillOpacity={1} fill="url(#energyGradient)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-vox-paper/20 text-center">
                <Zap size={48} className="mb-4 opacity-10" />
                <p className="font-serif italic">No energy data yet.<br/>Start logging to see your patterns.</p>
              </div>
            )}

            <div className="mt-12 space-y-4">
              <h4 className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold">Recent Logs</h4>
              <div className="space-y-3">
                {(user.socialEnergyHistory || []).slice(0, 3).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <div className="text-sm font-medium text-white">{entry.activity || 'Social Interaction'}</div>
                      <div className="text-[10px] text-vox-paper/40 uppercase tracking-wider">{new Date(entry.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div className="text-xl font-bold text-vox-accent">{entry.energyLevel}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AvoidanceLoopBreaker = ({ user, setUser, onBack }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void }) => {
  const [situation, setSituation] = useState('');
  const [detectedLoop, setDetectedLoop] = useState<AvoidanceEntry | null>(null);

  const commonPatterns = [
    "Phone calls",
    "Checking emails",
    "Asking for help",
    "Giving feedback",
    "Social events",
    "Difficult conversations",
    "Starting a new task"
  ];

  const handleLogAvoidance = (textOverride?: string) => {
    const textToLog = textOverride || situation;
    if (!textToLog.trim()) return;

    const existing = (user.avoidanceHistory || []).find(e => e.situation.toLowerCase() === textToLog.toLowerCase());
    
    let updatedHistory: AvoidanceEntry[];
    let newEntry: AvoidanceEntry;

    if (existing) {
      newEntry = {
        ...existing,
        count: existing.count + 1,
        timestamp: Date.now(),
        lastAvoided: Date.now()
      };
      updatedHistory = [newEntry, ...(user.avoidanceHistory || []).filter(e => e.id !== existing.id)];
    } else {
      newEntry = {
        id: Math.random().toString(36).substr(2, 9),
        situation: textToLog,
        count: 1,
        timestamp: Date.now(),
        lastAvoided: Date.now()
      };
      updatedHistory = [newEntry, ...(user.avoidanceHistory || [])];
    }

    setUser(prev => prev ? ({
      ...prev,
      avoidanceHistory: updatedHistory
    }) : null);

    if (newEntry.count >= 3) {
      setDetectedLoop(newEntry);
    } else {
      setDetectedLoop(null);
    }

    if (!textOverride) setSituation('');
  };

  const handleDeleteEntry = (id: string) => {
    setUser(prev => prev ? ({
      ...prev,
      avoidanceHistory: (prev.avoidanceHistory || []).filter(e => e.id !== id)
    }) : null);
    if (detectedLoop?.id === id) setDetectedLoop(null);
  };

  const getSmallestStep = (situation: string) => {
    // In a real app, this could be AI generated
    const steps: Record<string, string> = {
      'phone call': 'Send a text message first to schedule the call.',
      'meeting': 'Just join the meeting and keep your camera off for the first 5 minutes.',
      'party': 'Commit to staying for just 15 minutes, then you can leave.',
      'presentation': 'Read your opening slide out loud to yourself in the mirror.',
      'feedback': 'Write down one question you want to ask about the feedback.'
    };

    const key = Object.keys(steps).find(k => situation.toLowerCase().includes(k));
    return steps[key || 'default'] || `Just think about the first 30 seconds of ${situation} and nothing else.`;
  };

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-16 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Avoidance Loop Breaker</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Pattern interruption, not just motivation</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="max-w-2xl mx-auto relative z-10 space-y-8">
        <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
          <h3 className="text-2xl font-serif italic text-white mb-8">What did you skip today?</h3>
          <div className="space-y-6">
            <div className="relative">
              <input 
                type="text" 
                placeholder="e.g. That phone call to the bank"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-vox-accent transition-colors"
              />
              <button 
                onClick={() => handleLogAvoidance()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-vox-accent text-vox-bg rounded-xl hover:scale-105 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
            <p className="text-vox-paper/40 text-xs italic px-2">
              Logging avoidance helps you see patterns you might not notice.
            </p>

            <div className="pt-4">
              <div className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold mb-4">Common Patterns</div>
              <div className="flex flex-wrap gap-2">
                {commonPatterns.map(pattern => (
                  <button 
                    key={pattern}
                    onClick={() => handleLogAvoidance(pattern)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-vox-paper/60 hover:bg-vox-accent/10 hover:text-vox-accent hover:border-vox-accent/20 transition-all"
                  >
                    + {pattern}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {detectedLoop && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-dark p-10 rounded-[3rem] border-2 border-vox-accent/30 bg-vox-accent/5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <RotateCcw size={120} className="animate-spin-slow" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-vox-accent mb-6">
                  <AlertTriangle size={24} />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Pattern Detected</span>
                </div>
                
                <h3 className="text-3xl font-light tracking-tighter text-white mb-4">
                  You've avoided <span className="text-vox-accent italic">"{detectedLoop.situation}"</span> {detectedLoop.count} times.
                </h3>
                
                <p className="text-vox-paper/60 text-lg font-serif italic mb-10 leading-relaxed">
                  The loop is getting stronger. Let's break it with the smallest possible step today.
                </p>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                  <div className="text-[10px] uppercase tracking-widest text-vox-accent font-bold mb-3">Your Smallest Step</div>
                  <p className="text-xl text-white font-medium">
                    {getSmallestStep(detectedLoop.situation)}
                  </p>
                </div>

                <button 
                  onClick={() => setDetectedLoop(null)}
                  className="w-full py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  I'll try this step
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <h4 className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold px-4">Avoidance History</h4>
          <div className="grid grid-cols-1 gap-4">
            {(user.avoidanceHistory || []).map((entry) => (
              <div key={entry.id} className="glass-dark p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-vox-accent/20 transition-all">
                <div>
                  <div className="text-lg text-white font-serif italic">{entry.situation}</div>
                  <div className="text-[10px] text-vox-paper/40 uppercase tracking-widest mt-1">
                    Last avoided {new Date(entry.lastAvoided).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${entry.count >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-vox-paper/40'}`}>
                    {entry.count} {entry.count === 1 ? 'time' : 'times'}
                  </div>
                  <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 text-vox-paper/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {(user.avoidanceHistory || []).length === 0 && (
              <div className="py-12 text-center text-vox-paper/20 font-serif italic">
                No avoidance patterns logged yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FutureSelfDialogue = ({ user, setUser, onBack, setView }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void, setView: (v: AppState) => void }) => {
  const [mode, setMode] = useState<'selection' | 'chat' | 'call'>('selection');

  if (mode === 'selection') {
    return (
      <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 vox-gradient opacity-20" />
        
        <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-16 relative z-10">
          <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
            <ChevronRight className="rotate-180" size={24} />
          </button>
          <div className="text-center">
            <h2 className="text-4xl font-light tracking-tighter text-white">Future Self Dialogue</h2>
            <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Connect with the you of tomorrow</p>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </header>

        <div className="flex-1 max-w-4xl mx-auto w-full relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center pb-32">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('chat')}
            className="glass-dark p-12 rounded-[3rem] border border-white/5 flex flex-col items-center text-center gap-8 hover:bg-white/10 transition-all group"
          >
            <div className="w-24 h-24 rounded-full bg-vox-accent/10 flex items-center justify-center text-vox-accent group-hover:scale-110 transition-transform">
              <MessageSquare size={48} />
            </div>
            <div>
              <h3 className="text-3xl font-serif italic text-white mb-4">Text Dialogue</h3>
              <p className="text-vox-paper/50 leading-relaxed">
                Reflective, deep, and written. Perfect for structured thoughts and long-term wisdom.
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('call')}
            className="glass-dark p-12 rounded-[3rem] border border-white/5 flex flex-col items-center text-center gap-8 hover:bg-white/10 transition-all group"
          >
            <div className="w-24 h-24 rounded-full bg-vox-accent/10 flex items-center justify-center text-vox-accent group-hover:scale-110 transition-transform">
              <Phone size={48} />
            </div>
            <div>
              <h3 className="text-3xl font-serif italic text-white mb-4">Voice Call</h3>
              <p className="text-vox-paper/50 leading-relaxed">
                Real-time, emotional, and visceral. Hear the warmth and confidence in your own future voice.
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    );
  }

  if (mode === 'chat') {
    return <FutureSelfChat user={user} setUser={setUser} onBack={() => setMode('selection')} setView={setView} />;
  }

  return <FutureSelfCall user={user} setUser={setUser} onBack={() => setMode('selection')} setView={setView} />;
};

const FutureSelfChat = ({ user, setUser, onBack, setView }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void, setView: (v: AppState) => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; timestamp: number }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isTranscribing]);

  const summarizeGrowth = (user: User) => {
    const courage = `Current Courage Level: ${user.courageLevel}%`;
    const history = user.courageHistory ? `Recent courage growth: ${JSON.stringify(user.courageHistory.slice(-5))}` : '';
    const avoidance = user.avoidanceHistory ? `Avoidance patterns: ${user.avoidanceHistory.map(e => `${e.situation} avoided ${e.count} times`).join(', ')}` : '';
    const energy = user.socialEnergyHistory ? `Recent social energy levels: ${user.socialEnergyHistory.slice(-5).map(e => `${e.energyLevel}%`).join(', ')}` : '';
    
    return `${courage}. ${history}. ${avoidance}. ${energy}.`;
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = { role: 'user' as const, text: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    if (!textOverride) setInput('');
    setIsTyping(true);

    try {
      const growthData = summarizeGrowth(user);
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const aiResponse = await generateFutureSelfDialogue(textToSend, history, growthData);
      
      const modelMessage = { role: 'model' as const, text: aiResponse, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMessage]);

      if (isVoiceEnabled) {
        const base64Audio = await generateSpeech(aiResponse, 'Kore'); // Using Kore for a wise, calm voice
        if (base64Audio) {
          playPCM(base64Audio);
        }
      }

      // Save to history
      const newEntry: FutureSelfDialogueEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        messages: [...messages, userMessage, modelMessage]
      };

      setUser(prev => prev ? ({
        ...prev,
        futureSelfDialogueHistory: [newEntry, ...(prev.futureSelfDialogueHistory || [])]
      }) : null);

    } catch (error) {
      console.error("Future Self Dialogue Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/ogg') 
          ? 'audio/ogg' 
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) return;
        
        setIsTranscribing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcription = await transcribeAudio(base64Audio, mimeType);
            
            // Check for safe word
            if (user.safeWord && transcription?.toLowerCase().includes(user.safeWord.toLowerCase())) {
              setView('anchor');
              return;
            }

            // Filter out silence/noise indicators
            const cleanTranscription = transcription?.replace(/\[.*?\]/g, '').trim();
            
            if (cleanTranscription && cleanTranscription.length > 1) {
              handleSendMessage(cleanTranscription);
            }
          } catch (err) {
            console.error("Transcription failed:", err);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("Microphone Error:", error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-8 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Future Self Dialogue</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Talk to the confident you (1 year later)</p>
        </div>
        <button 
          onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
          className={`p-3 rounded-full transition-all ${isVoiceEnabled ? 'bg-vox-accent/20 text-vox-accent' : 'bg-white/5 text-vox-paper/30'}`}
        >
          {isVoiceEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full relative z-10 flex flex-col glass-dark rounded-[3rem] border border-white/5 overflow-hidden mb-8">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/5">
          <div className="w-12 h-12 rounded-full bg-vox-accent/20 flex items-center justify-center text-vox-accent">
            <UserIcon size={24} />
          </div>
          <div>
            <h3 className="text-lg font-serif italic text-white">Confident {user.name}</h3>
            <p className="text-[10px] uppercase tracking-widest text-vox-accent font-bold">March 30, 2027</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
              <div className="w-20 h-20 rounded-full bg-vox-accent/10 flex items-center justify-center text-vox-accent animate-pulse">
                <Sparkles size={40} />
              </div>
              <div className="max-w-md">
                <h4 className="text-2xl font-serif italic text-white mb-4">I've been waiting for you.</h4>
                <p className="text-vox-paper/50 leading-relaxed">
                  I'm you, one year from now. I've seen the growth you're making today. What would you like to ask me?
                </p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] p-6 rounded-3xl ${m.role === 'user' ? 'bg-vox-accent text-vox-bg font-medium' : 'bg-white/5 border border-white/10 text-vox-paper'}`}>
                <p className="leading-relaxed">{m.text}</p>
                <div className={`mt-2 text-[8px] uppercase tracking-tighter ${m.role === 'user' ? 'text-vox-bg/50' : 'text-vox-paper/30'}`}>
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex gap-2">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 rounded-full bg-vox-accent" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 rounded-full bg-vox-accent" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 rounded-full bg-vox-accent" />
              </div>
            </div>
          )}

          {isTranscribing && (
            <div className="flex justify-end">
              <div className="bg-vox-accent/10 border border-vox-accent/20 p-4 rounded-2xl flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-vox-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-vox-accent uppercase tracking-widest font-bold">Transcribing your voice...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <div className="relative flex items-center gap-4">
            <button 
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onMouseLeave={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              className={`p-4 rounded-2xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-vox-paper/50 hover:text-vox-accent'}`}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isTyping) {
                    handleSendMessage();
                  }
                }
              }}
              disabled={isTyping || isTranscribing}
              maxLength={1000}
              placeholder={isTyping ? "Future self is thinking..." : "Ask your future self anything..."}
              className={`flex-1 bg-vox-bg/50 border rounded-2xl px-6 py-4 focus:outline-none transition-colors ${
                isTyping || isTranscribing ? 'opacity-50 cursor-not-allowed border-white/5' : 'border-white/10 focus:border-vox-accent'
              }`}
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isTyping}
              className="p-4 bg-vox-accent text-vox-bg rounded-2xl disabled:opacity-20 hover:scale-105 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
          {isListening && (
            <div className="mt-2 text-center text-[10px] uppercase tracking-widest text-vox-accent font-bold animate-pulse">
              Listening to your heart...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FutureSelfCall = ({ user, setUser, onBack, setView }: { user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, onBack: () => void, setView: (v: AppState) => void }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const isWorkletLoadedRef = useRef(false);
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sessionActiveRef.current = false;
  };

  const processQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      if (audioQueueRef.current.length === 0) setIsModelSpeaking(false);
      return;
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    isPlayingRef.current = true;
    setIsModelSpeaking(true);
    const buffer = audioQueueRef.current.shift()!;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      processQueue();
    };
    source.start();
  };

  const playAudio = async (base64Audio: string) => {
    if (!audioContextRef.current || !sessionActiveRef.current) return;
    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(len / 2));
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 0x7FFF;
      }

      const buffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
      buffer.getChannelData(0).set(floatData);
      audioQueueRef.current.push(buffer);
      if (!isPlayingRef.current) {
        processQueue();
      }
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    try {
      const growthData = `Current Courage: ${user.courageLevel}%. History: ${JSON.stringify(user.courageHistory?.slice(-5))}. Avoidance: ${user.avoidanceHistory?.map(e => e.situation).join(', ')}.`;
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            sessionActiveRef.current = true;
            sessionPromise.then(s => setupAudio(s));
          },
          onmessage: async (message: LiveServerMessage) => {
            // Check for user transcription (safe word check)
            const userText = (message as any).serverContent?.userTurn?.parts?.[0]?.text;
            if (userText && user.safeWord && userText.toLowerCase().includes(user.safeWord.toLowerCase())) {
              sessionRef.current?.close();
              setView('anchor');
              return;
            }

            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  playAudio(part.inlineData.data);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsModelSpeaking(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            sessionActiveRef.current = false;
            cleanupAudio();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError(err instanceof Error ? err.message : String(err));
            setIsConnecting(false);
            sessionActiveRef.current = false;
            cleanupAudio();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: `You are the Future Self of ${user.name}, one year from now (March 30, 2027). 
          You have grown significantly in courage and social skills. 
          
          YOUR MISSION:
          1. Provide a safe, emotional, and deeply encouraging conversation.
          2. Encourage ${user.name} to connect with the real world and step out of their comfort zone.
          3. Provide practical but gentle advice on how to deal with people, based on your own 'future' experiences.
          4. Talk like a real, empathetic human. Use a warm, gentle tone. Avoid clinical or logical language.
          5. Focus on emotional resonance and validation.
          
          CONTEXT ABOUT ${user.name}'S GROWTH:
          ${growthData}
          
          Keep your responses concise and focused on maintaining a supportive, comforting presence.`,
        },
      });
      
      sessionPromise.then(s => {
        sessionRef.current = s;
      });
    } catch (err) {
      console.error("Failed to connect:", err);
      setIsConnecting(false);
      setError("Failed to establish connection.");
    }
  };

  const setupAudio = async (session: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!inputContextRef.current) {
        inputContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      
      if (inputContextRef.current.state === 'suspended') {
        await inputContextRef.current.resume();
      }

      const source = inputContextRef.current.createMediaStreamSource(stream);
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkVolume = () => {
        if (!sessionActiveRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setIsUserSpeaking(average > 30);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();

      try {
        if (!isWorkletLoadedRef.current) {
          const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input.length > 0) {
                  const channelData = input[0];
                  this.port.postMessage(channelData);
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await inputContextRef.current.audioWorklet.addModule(url);
          isWorkletLoadedRef.current = true;
        }
        
        const workletNode = new AudioWorkletNode(inputContextRef.current, 'audio-processor');
        workletNode.port.onmessage = (event) => {
          if (!sessionActiveRef.current || !sessionRef.current) return;
          const inputData = event.data;
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        
        source.connect(workletNode);
        processorRef.current = workletNode;
      } catch (workletErr) {
        const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          if (!sessionActiveRef.current || !sessionRef.current || sessionRef.current.readyState !== 1) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        };
        source.connect(scriptProcessor);
        processorRef.current = scriptProcessor;
      }
    } catch (err: any) {
      console.error("Mic setup failed:", err);
      setError("Microphone access denied.");
    }
  };

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-16 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Future Self Call</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Voice connection to 2027</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full relative z-10 flex flex-col items-center justify-center pb-32">
        <div className="relative mb-20">
          <motion.div 
            animate={{ 
              scale: isModelSpeaking ? [1, 1.1, 1] : 1,
              opacity: isModelSpeaking ? [0.5, 1, 0.5] : 0.5
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -inset-12 bg-vox-accent/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: isUserSpeaking ? [1, 1.2, 1] : 1,
            }}
            className="w-48 h-48 rounded-full bg-vox-accent/10 border-2 border-vox-accent/30 flex items-center justify-center relative z-10 overflow-hidden"
          >
            <UserIcon size={80} className="text-vox-accent" />
            {isConnected && (
              <motion.div 
                animate={{ height: isUserSpeaking ? '60%' : '10%' }}
                className="absolute bottom-0 left-0 right-0 bg-vox-accent/20"
              />
            )}
          </motion.div>
        </div>

        <div className="text-center space-y-6 mb-16">
          <h3 className="text-3xl font-serif italic text-white">
            {!isConnected ? (isConnecting ? "Establishing Connection..." : "Ready to Connect") : "On Call with Future You"}
          </h3>
          <p className="text-vox-paper/50 max-w-sm mx-auto leading-relaxed">
            {!isConnected 
              ? "Your future self is waiting to hear your voice. This is an emotional space for encouragement." 
              : "I'm here. I can hear you. Tell me what's on your heart today."}
          </p>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex items-center gap-8">
          {!isConnected ? (
            <button 
              onClick={startSession}
              disabled={isConnecting}
              className="px-12 py-6 bg-vox-accent text-vox-bg rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-vox-accent/20 disabled:opacity-50"
            >
              {isConnecting ? "Connecting..." : "Start Call"}
            </button>
          ) : (
            <button 
              onClick={onBack}
              className="p-8 bg-red-500 text-white rounded-full hover:scale-110 active:scale-90 transition-all shadow-xl shadow-red-500/20"
            >
              <Phone size={32} className="rotate-[135deg]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SanctuaryGuide = ({ onBack }: { onBack: () => void }) => {
  const faqs = [
    {
      question: "What is the Constellation Map?",
      answer: "The Constellation Map is a visual representation of your emotional growth. Each star (node) represents a different feature or milestone. As you engage with the app, you'll unlock new paths and connections, showing how your courage and social energy are evolving.",
      icon: MapIcon,
      color: "text-vox-accent"
    },
    {
      question: "How do Meditations work?",
      answer: "Our meditations are voice-centric. They use calming soundscapes and guided prompts to help you ground yourself. You can choose from different themes like 'Calm', 'Focus', or 'Courage' to match your current state.",
      icon: Wind,
      color: "text-blue-400"
    },
    {
      question: "What is Social Energy tracking?",
      answer: "Social Energy helps you monitor your 'battery' for social interactions. By logging how you feel after different activities, you can identify patterns that drain or recharge you, helping you manage your boundaries more effectively.",
      icon: Zap,
      color: "text-yellow-400"
    },
    {
      question: "How can the Future Self Dialogue help me?",
      answer: "This feature uses AI to simulate a conversation with a version of yourself from one year in the future. It uses your actual growth data to provide perspective and encouragement, helping you see that the challenges you face today are stepping stones to your future strength.",
      icon: Sparkles,
      color: "text-purple-400"
    },
    {
      question: "What are Daily Rituals?",
      answer: "Rituals are small, repeatable acts of courage or self-care. By consistently performing these rituals, you build the 'muscle memory' of courage, making it easier to face larger challenges over time.",
      icon: Mic,
      color: "text-emerald-400"
    },
    {
      question: "What happens when I use my Safe Word?",
      answer: "Speaking your safe word immediately activates 'Anchor Mode'. This state prioritizes your safety by providing immediate grounding exercises, muting non-essential notifications, and optionally alerting your emergency contacts if you've set them up.",
      icon: Shield,
      color: "text-red-400"
    }
  ];

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper p-6 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      
      <header className="max-w-4xl mx-auto w-full flex justify-between items-center mb-12 relative z-10">
        <button onClick={onBack} className="p-3 hover:bg-white/5 rounded-full transition-colors text-vox-paper/50 hover:text-white">
          <ChevronRight className="rotate-180" size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-4xl font-light tracking-tighter text-white">Sanctuary Guide</h2>
          <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest mt-2 font-bold">Understanding your journey</p>
        </div>
        <div className="w-12" />
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full relative z-10 overflow-y-auto scrollbar-hide pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-dark p-8 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="flex items-start gap-6">
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${faq.color} group-hover:scale-110 transition-transform`}>
                  <faq.icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif italic text-white mb-3">{faq.question}</h3>
                  <p className="text-vox-paper/60 leading-relaxed text-sm">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 p-12 rounded-[3rem] bg-vox-accent/5 border border-vox-accent/10 text-center">
          <HelpCircle className="mx-auto mb-6 text-vox-accent" size={48} />
          <h3 className="text-2xl font-serif italic text-white mb-4">Still have questions?</h3>
          <p className="text-vox-paper/60 max-w-md mx-auto mb-8">
            Your journey is unique. If you need more specific guidance, our AI Companion is always available to discuss your progress and challenges.
          </p>
          <button 
            onClick={() => onBack()}
            className="px-8 py-3 bg-vox-accent text-vox-bg rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
          >
            Return to Sanctuary
          </button>
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onStart, isLoggedIn }: { onStart: () => void, isLoggedIn: boolean }) => (
  <div className="min-h-screen bg-vox-bg text-vox-paper selection:bg-vox-accent/30">
    <FloatingParticles />
    {/* Upper Title Bar */}
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex justify-between items-center backdrop-blur-md bg-vox-bg/40 border-b border-white/5">
      <div className="flex items-center gap-4">
        <VoxaraLogo className="w-10 h-10" />
        <div className="flex flex-col">
          <span className="text-lg font-serif tracking-tighter leading-none">VOXARA</span>
          <span className="text-[8px] uppercase tracking-[0.4em] text-vox-accent font-bold mt-1">Aura of voice,Power of Rise
</span>
        </div>
      </div>
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="px-6 py-2 rounded-full border border-vox-accent/30 bg-vox-accent/5 text-vox-accent text-xs font-bold uppercase tracking-widest hover:bg-vox-accent/20 transition-all"
      >
        {isLoggedIn ? 'Dashboard' : 'Sign In'}
      </motion.button>
    </nav>

    {/* Hero Section */}
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-60" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center max-w-5xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="inline-block mb-6 px-4 py-1.5 rounded-full border border-vox-accent/30 bg-vox-accent/5 text-vox-accent text-xs font-bold uppercase tracking-[0.3em]"
        >
          The Future of Emotional Courage
        </motion.div>
        
        <h1 className="text-8xl md:text-[12rem] mb-6 tracking-tighter leading-none font-serif">
          VOXARA
        </h1>
        
        <p className="text-xl md:text-3xl font-serif italic text-vox-paper/80 mb-12 max-w-3xl mx-auto leading-relaxed">
          "From silence to strength — at your pace, with real people by your side."
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button 
            onClick={onStart}
            className="group relative px-10 py-5 bg-vox-accent text-vox-bg rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(45,212,191,0.3)]"
          >
            <span className="relative z-10 flex items-center gap-3">
              {isLoggedIn ? 'Enter Your Sanctuary' : 'Begin Your Journey'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 rounded-full border border-white/10 bg-white/5 font-bold text-lg hover:bg-white/10 transition-all"
          >
            Watch the Story
          </motion.button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
      >
        <div className="text-vox-paper/30 text-[10px] uppercase tracking-[0.5em]">Explore the Silence</div>
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-px h-12 bg-gradient-to-b from-vox-accent to-transparent"
        />
      </motion.div>
    </section>

    {/* Features Bento Grid */}
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-20">
        <h2 className="text-4xl md:text-6xl mb-6">Audible Healing</h2>
        <p className="text-vox-paper/50 font-serif italic text-xl">Expression is a muscle. We help you train it.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 glass-dark p-10 rounded-[2.5rem] flex flex-col justify-between h-[400px] group">
          <div className="w-16 h-16 rounded-2xl bg-vox-accent/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <Mic size={32} className="text-vox-accent" />
          </div>
          <div>
            <h3 className="text-4xl mb-4">Whisper → Voice</h3>
            <p className="text-vox-paper/60 text-lg max-w-xl">
              Start with silent recordings or breath sounds. Move to whispers, then full voice notes. Fear reduces when expression is gradual.
            </p>
          </div>
        </div>

        <div className="md:col-span-4 glass-dark p-10 rounded-[2.5rem] flex flex-col justify-between h-[400px] group">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <Sparkles size={32} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-3xl mb-4">AI Companion</h3>
            <p className="text-vox-paper/60">
              Trauma-informed AI that validates first. It steps back when you're ready to talk to real humans.
            </p>
          </div>
        </div>

        <div className="md:col-span-4 glass-dark p-10 rounded-[2.5rem] flex flex-col justify-between h-[400px] group">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <Bridge size={32} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-3xl mb-4">Beloved Bridge™</h3>
            <p className="text-vox-paper/60">
              Practice difficult conversations in Ghost Mode. AI responds like your loved one to build your confidence.
            </p>
          </div>
        </div>

        <div className="md:col-span-8 glass-dark p-10 rounded-[2.5rem] flex flex-col justify-between h-[400px] group">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
            <Wind size={32} className="text-blue-400" />
          </div>
          <div>
            <h3 className="text-4xl mb-4">Presence Mode</h3>
            <p className="text-vox-paper/60 text-lg max-w-xl">
              Sometimes healing means not doing anything. Feel the heartbeat of another user through synchronized haptic vibrations.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* How it Works */}
    <section className="py-32 bg-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-5xl mb-8">The Path to Courage</h2>
            <div className="space-y-12">
              {[
                { step: "01", title: "Find Safety", desc: "Start in Presence Mode or with silent breath recordings. No judgment, just space." },
                { step: "02", title: "Test Your Voice", desc: "Whisper your thoughts. Our AI Companion validates your feelings without rushing solutions." },
                { step: "03", title: "Practice Connection", desc: "Use Ghost Mode to simulate conversations you're afraid to have in real life." },
                { step: "04", title: "Step Into Light", desc: "The app encourages you to reach out to real people when you're ready. We are the bridge, not the destination." }
              ].map((item, i) => (
                <div key={i} className="flex gap-8">
                  <span className="text-vox-accent font-mono text-xl">{item.step}</span>
                  <div>
                    <h4 className="text-2xl mb-2">{item.title}</h4>
                    <p className="text-vox-paper/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden glass-dark border border-white/10 flex items-center justify-center">
              <div className="absolute inset-0 vox-gradient opacity-20" />
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 10 }}
                className="relative z-10"
              >
                <Activity size={200} className="text-vox-accent/20" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Final CTA */}
    <section className="py-40 text-center px-6">
      <h2 className="text-6xl md:text-8xl mb-12 font-serif italic">Ready to be heard?</h2>
      <button 
        onClick={onStart}
        className="px-12 py-6 bg-vox-paper text-vox-ink rounded-full font-bold text-2xl hover:scale-105 active:scale-95 transition-all"
      >
        Start Your Free Journey
      </button>
      <p className="mt-8 text-vox-paper/40">No credit card required. Just your courage.</p>
    </section>

    <footer className="py-12 border-t border-white/5 text-center text-vox-paper/30 text-xs uppercase tracking-widest">
      &copy; 2026 VOXARA — From Silence to Strength
    </footer>
  </div>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await logIn(email, password);
      } else {
        await signUp(email, password, name);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 vox-gradient opacity-20" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-dark p-10 rounded-3xl w-full max-w-md relative z-10"
      >
        <h2 className="text-4xl mb-8 text-center">{isLogin ? 'Welcome Back' : 'Join the Circle'}</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-vox-paper/50 mb-2">Full Name</label>
              <motion.input 
                whileFocus={{ scale: 1.01, borderColor: "rgba(45, 212, 191, 0.5)" }}
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-vox-accent transition-all"
                placeholder="How should we call you?"
                required={!isLogin}
              />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-widest text-vox-paper/50 mb-2">Email Address</label>
            <motion.input 
              whileFocus={{ scale: 1.01, borderColor: "rgba(45, 212, 191, 0.5)" }}
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-vox-accent transition-all"
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-vox-paper/50 mb-2">Password</label>
            <motion.input 
              whileFocus={{ scale: 1.01, borderColor: "rgba(45, 212, 191, 0.5)" }}
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-vox-accent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="w-full py-4 bg-vox-accent text-white rounded-xl font-semibold hover:bg-vox-accent/90 transition-colors disabled:opacity-50 shadow-lg shadow-vox-accent/20"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </motion.button>
        </form>
        <p className="mt-8 text-center text-vox-paper/40 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-vox-accent font-medium">
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const BackgroundEffects = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grain Overlay for "Silence" texture */}
      <div className="absolute inset-0 grain-overlay opacity-[0.03] z-50" />

      {/* Dynamic Gradient Orbs */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1,
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{ 
          opacity: { duration: 2 },
          scale: { duration: 20, repeat: Infinity, ease: "linear" },
          x: { duration: 20, repeat: Infinity, ease: "linear" },
          y: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-vox-accent/10 rounded-full blur-[120px]"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1,
          scale: [1, 1.3, 1],
          x: [0, -80, 0],
          y: [0, 100, 0],
        }}
        transition={{ 
          opacity: { duration: 2.5 },
          scale: { duration: 25, repeat: Infinity, ease: "linear" },
          x: { duration: 25, repeat: Infinity, ease: "linear" },
          y: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]"
      />
      
      {/* Vocal Waves Background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 3 }}
        className="absolute inset-0"
      >
        <svg className="w-full h-full" viewBox="0 0 1440 800" preserveAspectRatio="none">
          <motion.path
            animate={{
              d: [
                "M0 400 Q360 300 720 400 T1440 400",
                "M0 400 Q360 500 720 400 T1440 400",
                "M0 400 Q360 300 720 400 T1440 400"
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-vox-accent/20"
          />
          <motion.path
            animate={{
              d: [
                "M0 450 Q360 550 720 450 T1440 450",
                "M0 450 Q360 350 720 450 T1440 450",
                "M0 450 Q360 550 720 450 T1440 450"
              ]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-blue-500/20"
          />
        </svg>
      </motion.div>

      <motion.div 
        animate={{ 
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 vox-gradient opacity-40"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: [null, "-40px", "40px", null],
              opacity: [0, 0.4, 0],
              scale: [null, 1.2, 0.8, null]
            }}
            transition={{ 
              duration: 8 + Math.random() * 12, 
              repeat: Infinity, 
              delay: Math.random() * 10,
              ease: "easeInOut"
            }}
            className="absolute w-1 h-1 bg-vox-accent/40 rounded-full blur-[1px]"
          />
        ))}
      </div>

      {/* Vocal Ripples (Subtle) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [0.8, 1.5],
              opacity: [0, 0.1, 0]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              delay: i * 2.5,
              ease: "easeOut"
            }}
            className="absolute border border-vox-accent/20 rounded-full w-[80vw] aspect-square"
          />
        ))}
      </div>

      {/* Silence to Strength: Light Beam */}
      <motion.div 
        initial={{ opacity: 0, x: 100 }}
        animate={{ 
          opacity: [0.05, 0.2, 0.05],
          rotate: [0, 5, 0],
          x: 0
        }}
        transition={{ 
          opacity: { duration: 15, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 15, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 2, ease: "easeOut" }
        }}
        className="absolute top-0 right-0 w-[100vw] h-[100vh] bg-gradient-to-bl from-vox-accent/15 via-transparent to-transparent origin-top-right skew-x-12 blur-3xl"
      />
    </div>
  );
};

const StrengthMap = ({ history }: { history: CourageHistoryEntry[] }) => {
  const data = history.length > 0 ? history.map(h => ({
    name: new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    level: h.level || 0,
    timestamp: h.timestamp
  })) : [
    { name: 'Start', level: 0, timestamp: Date.now() - 86400000 * 6 },
    { name: 'Day 2', level: 10, timestamp: Date.now() - 86400000 * 5 },
    { name: 'Day 3', level: 25, timestamp: Date.now() - 86400000 * 4 },
    { name: 'Day 4', level: 45, timestamp: Date.now() - 86400000 * 3 },
    { name: 'Day 5', level: 40, timestamp: Date.now() - 86400000 * 2 },
    { name: 'Today', level: 65, timestamp: Date.now() }
  ];

  return (
    <div className="h-full w-full relative group">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
            dy={15}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
            dx={-10}
          />
          <Tooltip 
            cursor={{ stroke: '#2dd4bf', strokeWidth: 1, strokeDasharray: '4 4' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass-dark p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl">
                    <div className="text-[10px] uppercase tracking-widest text-vox-paper/40 mb-1 font-bold">
                      {payload[0].payload.name}
                    </div>
                    <div className="text-2xl font-light tracking-tighter text-vox-accent">
                      {payload[0].value}% <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Courage</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="level" 
            stroke="#2dd4bf" 
            fillOpacity={1} 
            fill="url(#colorLevel)" 
            strokeWidth={4}
            animationDuration={2000}
            activeDot={{ r: 6, fill: '#2dd4bf', stroke: '#020617', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const ExitPrompt = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-vox-bg/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-dark p-12 rounded-[3rem] border border-vox-accent/30 max-w-lg w-full text-center space-y-8 shadow-2xl"
      >
        <div className="w-20 h-20 rounded-full bg-vox-accent/20 flex items-center justify-center mx-auto text-vox-accent">
          <Sparkles size={40} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-light tracking-tighter">You've Reached Full Strength</h2>
          <p className="text-vox-paper/60 leading-relaxed">
            Your courage index has reached 100%. You have built a resilient sanctuary within yourself. Are you ready to step out of the sanctuary and face the world with your new-found strength?
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <button 
            onClick={onConfirm}
            className="w-full py-5 bg-vox-accent text-vox-bg rounded-2xl font-bold uppercase tracking-widest hover:bg-vox-accent/80 transition-all"
          >
            Yes, I am ready to exit
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-5 bg-white/5 text-vox-paper/40 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Not yet, I'll stay a bit longer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ExitScreen = ({ onRestart }: { onRestart: () => void }) => {
  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper flex flex-col items-center justify-center p-12 text-center space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-6xl font-light tracking-tighter">Farewell, Seeker</h1>
        <p className="text-xl text-vox-paper/40 font-serif italic">The sanctuary will always be here, but your strength is now your own.</p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-px h-32 bg-gradient-to-b from-vox-accent to-transparent"
      />

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={onRestart}
        className="text-vox-accent uppercase tracking-[0.4em] text-xs font-bold hover:tracking-[0.6em] transition-all"
      >
        Return to Sanctuary
      </motion.button>
    </div>
  );
};

const FearMapEvolution = ({ history }: { history: CourageHistoryEntry[] }) => {
  const data = history.length > 0 ? history.map(h => ({
    name: new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    rejection: h.rejection || 0,
    conflict: h.conflict || 0,
    misunderstanding: h.misunderstanding || 0,
    vulnerability: h.vulnerability || 0,
  })) : [
    { name: 'Mon', rejection: 40, conflict: 30, misunderstanding: 20, vulnerability: 50 },
    { name: 'Tue', rejection: 35, conflict: 45, misunderstanding: 25, vulnerability: 55 },
    { name: 'Wed', rejection: 45, conflict: 40, misunderstanding: 30, vulnerability: 45 },
    { name: 'Thu', rejection: 30, conflict: 35, misunderstanding: 35, vulnerability: 60 },
    { name: 'Fri', rejection: 25, conflict: 30, misunderstanding: 40, vulnerability: 65 },
    { name: 'Sat', rejection: 20, conflict: 25, misunderstanding: 45, vulnerability: 70 },
    { name: 'Sun', rejection: 15, conflict: 20, misunderstanding: 50, vulnerability: 75 }
  ];

  const categories = [
    { key: 'rejection', color: '#2dd4bf', label: 'Rejection' },
    { key: 'conflict', color: '#fb923c', label: 'Conflict' },
    { key: 'misunderstanding', color: '#a855f7', label: 'Misunderstanding' },
    { key: 'vulnerability', color: '#facc15', label: 'Vulnerability' }
  ];

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
            dy={15}
          />
          <YAxis 
            domain={[0, 100]} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}
            dx={-10}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="glass-dark p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-2xl min-w-[180px]">
                    <div className="text-[10px] uppercase tracking-widest text-vox-paper/40 mb-3 font-bold">
                      {label}
                    </div>
                    <div className="space-y-2">
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[10px] uppercase tracking-widest font-bold text-vox-paper/60">{entry.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-vox-paper">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {categories.map(cat => (
            <Area 
              key={cat.key}
              type="monotone" 
              dataKey={cat.key} 
              stroke={cat.color} 
              fillOpacity={0.05} 
              fill={cat.color} 
              strokeWidth={2}
              stackId="1"
              animationDuration={2000}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-6">
        {categories.map(cat => (
          <div key={cat.key} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-[8px] uppercase tracking-widest font-bold text-vox-paper/30">{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ThoughtOfTheDay = () => {
  const thoughts = [
    "Courage is not the absence of fear, but the triumph over it.",
    "Your voice is a bridge to your true self.",
    "In the silence of the sanctuary, find the strength to speak.",
    "Every whisper is a step towards clarity.",
    "The journey of a thousand miles begins with a single breath.",
    "Vulnerability is the birthplace of innovation, creativity and change.",
    "You are stronger than the fog that surrounds you.",
    "Silence is only scary until you find the words to fill it.",
    "Your story matters, even the parts you haven't whispered yet.",
    "Healing is not linear, but every step counts."
  ];
  
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const thought = thoughts[dayOfYear % thoughts.length];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full pt-20 pb-12 px-6 text-center border-b border-white/5 bg-gradient-to-b from-vox-accent/5 to-transparent relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.1)_0%,transparent_70%)]" />
      </div>
      <div className="max-w-3xl mx-auto relative z-10">
        <Quote className="text-vox-accent/20 mx-auto mb-6" size={48} />
        <h3 className="text-3xl md:text-4xl font-serif italic text-vox-paper/90 leading-tight tracking-tight">
          "{thought}"
        </h3>
        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="w-8 h-[1px] bg-vox-accent/30" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-vox-paper/30 font-bold">Daily Reflection</span>
          <div className="w-8 h-[1px] bg-vox-accent/30" />
        </div>
      </div>
    </motion.div>
  );
};

const Home = ({ user, setView }: { user: User, setView: (v: AppState) => void }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    setMousePos({
      x: (clientX / innerWidth - 0.5) * 20,
      y: (clientY / innerHeight - 0.5) * 20,
    });
  };

  const nodes = [
    { id: 'meditations', label: 'Meditations', x: 20, y: 45, icon: Moon, desc: 'Guided mindfulness journeys for inner peace.', priority: true, size: 'large' },
    { id: 'whisper', label: 'Whisper', x: 35, y: 30, icon: Mic, desc: 'A safe space to speak your unspoken truths.', priority: true, size: 'xl' },
    { id: 'calm', label: 'Grief Support', x: 50, y: 20, icon: Heart, desc: 'Gentle guidance through loss and healing.' },
    { id: 'circles', label: 'Connections', x: 85, y: 45, icon: Users, desc: 'Supportive community spaces and circles.' },
    { id: 'journal', label: 'Journal', x: 70, y: 65, icon: BookOpen, desc: 'Reflect on your daily path and insights.' },
    { id: 'rituals', label: 'Rituals', x: 50, y: 75, icon: Sparkles, desc: 'Daily habits to ground your spirit.' },
    { id: 'avoidance', label: 'Avoidance', x: 25, y: 15, icon: RotateCcw, desc: 'Break patterns that hold you back.' },
    { id: 'future-self', label: 'Future Self', x: 10, y: 55, icon: Sparkles, desc: 'Connect with your future, confident self.' },
    { id: 'simulation', label: 'Beloved Bridge', x: 45, y: 45, icon: Zap, desc: 'A scaffold for emotional growth. Practice vulnerability before connecting in the real world.', priority: true, size: 'large' },
    { id: 'anchor', label: 'Anchor', x: 85, y: 15, icon: Shield, desc: 'Immediate grounding and safety tools.' },
    { id: 'energy', label: 'Social Energy', x: 92, y: 35, icon: Zap, desc: 'Track and manage your social battery.' },
  ];

  const lines = [
    ['meditations', 'whisper'],
    ['whisper', 'calm'],
    ['whisper', 'future-self'],
    ['avoidance', 'calm'],
    ['calm', 'anchor'],
    ['calm', 'simulation'],
    ['anchor', 'circles'],
    ['circles', 'journal'],
    ['journal', 'rituals'],
    ['rituals', 'meditations'],
    ['simulation', 'future-self'],
    ['simulation', 'rituals'],
    ['circles', 'energy'],
    ['anchor', 'energy'],
  ];

  return (
    <div 
      className="min-h-screen bg-vox-bg text-vox-paper overflow-hidden relative" 
      onClick={() => setActiveNode(null)}
      onMouseMove={handleMouseMove}
    >
      <Starfield />
      <FloatingParticles />
      
      {/* Dynamic Nebula Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glows centered around priority nodes */}
        <div className="absolute top-[30%] left-[35%] w-[60vw] h-[60vw] bg-vox-accent/10 blur-[140px] rounded-full animate-pulse" />
        <div className="absolute top-[25%] left-[75%] w-[40vw] h-[40vw] bg-vox-accent/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-white/5 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <div className="absolute top-16 left-16 z-30">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-5xl font-light tracking-tighter">
            Your voice exists. <span className="text-vox-accent font-serif italic">Even in the quiet.</span>
          </h1>
          <motion.p 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="text-vox-paper/40 text-xs uppercase tracking-[0.4em] mt-4 font-medium flex items-center gap-4"
          >
            <span className="w-8 h-px bg-vox-accent/30" />
            Let it guide you home
          </motion.p>
        </motion.div>
      </div>

      {/* Constellation Container */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pt-20"
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        <div className="relative w-full h-full max-w-6xl max-h-[75vh]">
          {/* SVG Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(45, 212, 191, 0.05)" />
                <stop offset="50%" stopColor="rgba(45, 212, 191, 0.35)" />
                <stop offset="100%" stopColor="rgba(45, 212, 191, 0.05)" />
              </linearGradient>
            </defs>
            {lines.map(([startId, endId], i) => {
              const start = nodes.find(n => n.id === startId)!;
              const end = endId ? nodes.find(n => n.id === endId)! : null;
              if (!end) return null;
              return (
                <motion.line
                  key={i}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, delay: i * 0.05 }}
                  x1={`${start.x}%`}
                  y1={`${start.y}%`}
                  x2={`${end.x}%`}
                  y2={`${end.y}%`}
                  stroke="url(#lineGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  className="opacity-60"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: 'spring',
                stiffness: 100,
                damping: 15,
                delay: 0.3 + idx * 0.04 
              }}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
            >
              {/* Star Glow Effect */}
              <div className={`absolute inset-0 bg-white blur-2xl transition-all duration-700 rounded-full ${node.size === 'xl' ? 'scale-[5] opacity-20' : node.size === 'large' ? 'scale-[4] opacity-15' : node.priority ? 'scale-[3.5] opacity-10' : 'scale-[2.5] opacity-0'} ${activeNode === node.id ? 'opacity-30 scale-[5.5]' : ''}`} />
              
              {/* Node Interaction Area */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNode(activeNode === node.id ? null : node.id);
                }}
                className="relative flex flex-col items-center"
              >
                {/* The "Star" */}
                <div className="relative">
                  <div className={`rounded-full bg-white transition-all duration-500 ${node.size === 'xl' ? 'w-5 h-5' : node.size === 'large' ? 'w-4 h-4' : node.priority ? 'w-3 h-3' : 'w-2 h-2'} ${activeNode === node.id ? 'scale-125 shadow-[0_0_30px_rgba(255,255,255,0.8)]' : ''}`} />
                  {/* Outer Ring */}
                  <div className={`absolute inset-0 -m-3 border border-white/30 rounded-full transition-all duration-500 ${activeNode === node.id ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`} />
                </div>

                {/* Minimal Label */}
                <div className="absolute top-6 flex flex-col items-center pointer-events-none">
                  <span className={`text-[9px] uppercase tracking-[0.4em] font-bold transition-all duration-500 whitespace-nowrap ${activeNode === node.id ? 'text-vox-paper/80 translate-y-1' : 'text-vox-paper/20'}`}>
                    {node.label}
                  </span>
                </div>
              </button>

              {/* Elegant Feature Card */}
              <AnimatePresence>
                {activeNode === node.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 w-72 glass-dark p-8 rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] z-50 pointer-events-auto backdrop-blur-3xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center text-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-white border border-white/10">
                        <node.icon size={28} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-2xl font-light tracking-tight">{node.label}</h3>
                        <p className="text-xs text-vox-paper/40 leading-relaxed font-serif italic">
                          {node.desc}
                        </p>
                      </div>
                      <button 
                        onClick={() => setView(node.id as AppState)}
                        className="w-full py-4 bg-white text-vox-bg rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                      >
                        Enter Space <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bottom Navigation Hint */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="text-[9px] uppercase tracking-[0.5em] text-vox-paper/20 font-bold">Select a star to begin your journey</div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, setView, setUser }: { user: User, setView: (v: AppState) => void, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper selection:bg-vox-accent/30 overflow-x-hidden">
      <FloatingParticles />
      <BackgroundEffects />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto pt-24 pb-48">
        <header className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-vox-accent font-bold mb-4">Analytics & Insights</div>
            <h2 className="text-7xl font-light tracking-tighter mb-4">Progress</h2>
            <p className="text-vox-paper/40 font-serif italic text-2xl">Your journey of courage and growth, visualized.</p>
          </div>
          <div className="flex gap-4">
            <div className="glass-dark px-8 py-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
              <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 mb-2 font-bold">Courage Index</div>
              <div className="text-4xl font-light tracking-tighter text-vox-accent">{user.courageLevel}%</div>
            </div>
            <div className="glass-dark px-8 py-6 rounded-3xl border border-white/5 text-center min-w-[140px]">
              <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 mb-2 font-bold">Rituals Done</div>
              <div className="text-4xl font-light tracking-tighter text-vox-paper/80">{user.dailyRituals?.filter(r => r.completed).length || 0}</div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Strength Map Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-8 glass-dark p-12 rounded-[4rem] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-vox-accent/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-vox-accent/10" />
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div>
                <h3 className="text-3xl font-light tracking-tight mb-2">Strength Map</h3>
                <p className="text-vox-paper/40 text-sm font-serif italic">The trajectory of your inner resilience.</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20">
                <Sparkles className="text-vox-accent" size={24} />
              </div>
            </div>
            <div className="h-[400px] relative z-10">
              <StrengthMap history={user.courageHistory || []} />
            </div>
          </motion.div>

          {/* Quick Stats Sidebar */}
          <div className="lg:col-span-4 space-y-12">
            {/* Echo Chamber Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-dark p-10 rounded-[3rem] border border-white/5 flex flex-col h-full relative overflow-hidden group"
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 blur-[60px] rounded-full -mb-16 -mr-16" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-2xl font-light tracking-tight mb-2">Echo Chamber</h3>
                    <p className="text-vox-paper/40 text-xs uppercase tracking-widest font-bold">Voice Legacy</p>
                  </div>
                  <History className="text-vox-paper/30" size={24} />
                </div>
                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-vox-accent/30 transition-all">
                    <div className="text-[10px] text-vox-paper/30 uppercase tracking-widest mb-2 font-bold">Recent Activity</div>
                    <div className="text-2xl font-light tracking-tighter">
                      {user.voiceNotes?.length || 0} <span className="text-sm text-vox-paper/40 font-serif italic">Notes Recorded</span>
                    </div>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-vox-accent/30 transition-all">
                    <div className="text-[10px] text-vox-paper/30 uppercase tracking-widest mb-2 font-bold">Journaling</div>
                    <div className="text-2xl font-light tracking-tighter">
                      {user.journalEntries?.length || 0} <span className="text-sm text-vox-paper/40 font-serif italic">Reflections</span>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setView('echo')} 
                className="mt-12 w-full py-5 rounded-2xl bg-vox-accent text-vox-bg text-xs font-bold uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-vox-accent/10"
              >
                Open History
              </button>
            </motion.div>
          </div>

          {/* Maps Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-7 glass-dark p-12 rounded-[4rem] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-vox-accent/5 blur-[100px] rounded-full -ml-32 -mt-32" />
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div>
                <h3 className="text-3xl font-light tracking-tight mb-2">Courage Map</h3>
                <p className="text-vox-paper/40 text-sm font-serif italic">Emotional evolution over the last 7 days.</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20">
                <MapIcon className="text-vox-accent" size={24} />
              </div>
            </div>
            <div className="h-[350px] relative z-10">
              <FearMapEvolution history={user.courageHistory || []} />
            </div>
            <button 
              onClick={() => setView('map')} 
              className="mt-16 w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-[0.3em] text-vox-paper/60 hover:bg-vox-accent hover:text-vox-bg hover:border-vox-accent transition-all"
            >
              Open Full Map
            </button>
          </motion.div>

          {/* Fear Map Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5 glass-dark p-12 rounded-[4rem] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-vox-accent/5 blur-[100px] rounded-full -mr-32 -mb-32" />
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div>
                <h3 className="text-3xl font-light tracking-tight mb-2">Fear Breakdown</h3>
                <p className="text-vox-paper/40 text-sm font-serif italic">Current challenges and focus areas.</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20">
                <Shield className="text-vox-accent" size={24} />
              </div>
            </div>
            <div className="relative z-10">
              <FearMap data={{
                rejection: user.courageHistory?.[user.courageHistory.length - 1]?.rejection || 0,
                conflict: user.courageHistory?.[user.courageHistory.length - 1]?.conflict || 0,
                misunderstanding: user.courageHistory?.[user.courageHistory.length - 1]?.misunderstanding || 0,
                vulnerability: user.courageHistory?.[user.courageHistory.length - 1]?.vulnerability || 0,
              }} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Waveform = ({ isActive, color = "#0EA5E9", barCount = 20 }: { isActive: boolean, color?: string, barCount?: number }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: isActive ? [8, Math.random() * 32 + 8, 8] : 8,
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

const WhisperMode = ({ onBack, user, setUser, safePlayPCM, stopAllAudio, setView }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, safePlayPCM: any, stopAllAudio: () => void, setView: (view: AppState) => void }) => {
  const [mode, setMode] = useState<'breath' | 'whisper' | 'voice'>('whisper');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [practiceWord, setPracticeWord] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startSession = () => {
    stopAllAudio();
    setSessionActive(true);
  };

  const endSession = () => {
    stopAllAudio();
    resetRecording();
    setSessionActive(false);
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const base64Audio = dataUrl.split(',')[1];
        setRecordedAudio(dataUrl);
        setIsTranscribing(true);
        
        try {
          if (practiceWord) {
            const feedback = await analyzePracticeAudio(practiceWord, base64Audio, mimeType, mode);
            setPracticeFeedback(feedback);
          } else {
            const text = await transcribeAudio(base64Audio, mimeType);
            setTranscription(text);
            
            // Check for safe word
            if (user.safeWord && text.toLowerCase().includes(user.safeWord.toLowerCase())) {
              setView('anchor');
              return;
            }

            // Get AI Insight for standard recording
            const insight = await generateVoiceInsight(text, base64Audio, mimeType, mode);
            setPracticeFeedback(insight); // Reuse practiceFeedback for the insight
          }
        } catch (err) {
          console.error("Whisper recording error:", err);
          setTranscription("[Error processing audio. Please try again.]");
        } finally {
          setIsTranscribing(false);
        }
      };
    };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      let errorMessage = "Microphone access denied. Please check your browser permissions.";
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone found. Please connect a device and try again.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = "Microphone access blocked. Please enable permissions in your browser settings to use voice features.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = "Your microphone is currently in use by another application. Please close it and try again.";
      }
      setMicError(errorMessage);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const resetRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setTimer(0);
    setTranscription(null);
    setPracticeFeedback(null);
    setRecordedAudio(null);
  };

  const saveNote = () => {
    setIsSaving(true);
    const newNote: VoiceNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: timer,
      type: mode,
      isPrivate: true,
      text: transcription || practiceFeedback || undefined,
      audioData: recordedAudio || undefined
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
      };
    });

    // Whisper saved

    setTimeout(() => {
      setIsSaving(false);
      setTranscription(null);
      setPracticeFeedback(null);
      setTimer(0);
    }, 1000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <button onClick={() => { stopAllAudio(); onBack(); }} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      {!sessionActive ? (
        <div className="text-center relative z-10 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-24 h-24 rounded-full bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
              <Mic size={40} className="text-vox-accent" />
            </div>
            <h2 className="text-6xl font-light tracking-tighter mb-6">Whisper Ritual</h2>
            <p className="text-vox-paper/40 mb-12 font-serif italic text-xl leading-relaxed">
              "In the silence of the sanctuary, your voice finds its true resonance. 
              Breath by breath, whisper by whisper, we reclaim our strength."
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass p-6 rounded-3xl border border-white/5">
                <Wind size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Breath</div>
                <p className="text-[10px] text-vox-paper/30">Release tension through soundless exhale.</p>
              </div>
              <div className="glass p-6 rounded-3xl border border-white/5">
                <Mic size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Whisper</div>
                <p className="text-[10px] text-vox-paper/30">Practice soft, intentional vocalization.</p>
              </div>
              <div className="glass p-6 rounded-3xl border border-white/5">
                <Activity size={24} className="text-vox-accent mb-4 mx-auto" />
                <div className="text-[10px] uppercase tracking-widest font-bold mb-2">Voice</div>
                <p className="text-[10px] text-vox-paper/30">Full resonance and emotional clarity.</p>
              </div>
            </div>
            <button 
              onClick={startSession}
              className="px-12 py-5 bg-vox-accent text-vox-bg rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl shadow-vox-accent/20 hover:scale-105 transition-all"
            >
              Begin Ritual
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          <div className="text-center mb-12 relative z-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <h2 className="text-6xl font-light tracking-tighter capitalize">{mode} Mode</h2>
              <button 
                onClick={endSession}
                className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-bold hover:bg-red-500/20 transition-all"
              >
                End Ritual
              </button>
            </div>
            <p className="text-vox-paper/50 font-serif italic text-lg">
              {mode === 'breath' && "Just let your breath be heard. No words needed."}
              {mode === 'whisper' && "Speak softly. The world is listening gently."}
              {mode === 'voice' && "Your voice is your strength. Let it out."}
            </p>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 w-full max-w-7xl relative z-10">
        {/* Main Recorder */}
        <div className="lg:col-span-2 glass-dark rounded-[4rem] p-12 flex flex-col items-center justify-center border border-white/5">
          <div className="relative flex items-center justify-center mb-12">
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.8, opacity: 0.1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute w-64 h-64 rounded-full bg-vox-accent"
                />
              )}
            </AnimatePresence>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 shadow-red-500/20' : 'bg-vox-accent shadow-vox-accent/20'}`}
            >
              {isRecording ? <Square size={48} fill="white" /> : <Mic size={48} fill="white" />}
            </motion.button>
          </div>

          {isRecording && (
            <div className="mb-8">
              <Waveform isActive={true} color={mode === 'breath' ? '#60a5fa' : '#2DD4BF'} barCount={30} />
              <div className="text-center mt-4 text-[10px] uppercase tracking-[0.3em] text-vox-paper/40 font-bold">
                Capturing your {mode}...
              </div>
            </div>
          )}

          {micError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-3"
            >
              <AlertCircle size={16} />
              {micError}
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-4 mb-12">
            <div className="text-7xl font-mono tracking-tighter text-vox-paper flex items-baseline gap-3">
              <span className="text-vox-accent tabular-nums">{formatTime(timer)}</span>
              <span className="text-xs font-sans uppercase tracking-[0.3em] text-vox-paper/20 font-bold">Duration</span>
            </div>
            
            <AnimatePresence>
              {timer > 0 && (
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={resetRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-vox-paper/40 hover:text-vox-paper hover:bg-white/10 transition-all"
                >
                  <RotateCcw size={12} /> {isRecording ? 'Cancel Recording' : 'Reset Session'}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {isTranscribing && (
            <div className="text-vox-accent text-sm animate-pulse mb-8 font-bold tracking-widest uppercase">Analyzing your voice...</div>
          )}

          {(transcription || practiceFeedback) && !isRecording && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full glass p-8 rounded-3xl text-center border mb-8 ${practiceFeedback ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-vox-accent/10'}`}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                {practiceFeedback ? <Sparkles className="text-emerald-400" size={16} /> : <Activity className="text-vox-accent" size={16} />}
                <div className={`text-[10px] uppercase tracking-widest font-bold ${practiceFeedback ? 'text-emerald-400' : 'text-vox-accent'}`}>
                  {practiceFeedback ? 'AI Courage Analysis' : 'Transcription'}
                </div>
              </div>
              <p className="font-serif italic text-2xl leading-relaxed mb-6">
                "{transcription || practiceFeedback}"
              </p>
              
              <button 
                onClick={saveNote}
                disabled={isSaving}
                className="flex items-center gap-2 mx-auto px-8 py-3 bg-vox-accent text-vox-bg rounded-full font-bold hover:scale-105 transition-all disabled:opacity-50 shadow-xl shadow-vox-accent/20"
              >
                {isSaving ? <Activity className="animate-spin" size={20} /> : <Heart size={20} />}
                {isSaving ? 'Saving to Echo Chamber...' : 'Save to Echo Chamber'}
              </button>
            </motion.div>
          )}

          <div className="flex gap-4 glass p-2 rounded-full mt-8">
            {(['breath', 'whisper', 'voice'] as const).map((m) => (
              <button 
                key={m}
                onClick={() => {
                  setMode(m);
                  setTranscription(null);
                  setPracticeWord('');
                  setPracticeFeedback(null);
                  setTimer(0);
                }}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${mode === m ? 'bg-vox-accent text-vox-bg' : 'text-vox-paper/40 hover:bg-white/5'}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar: Practice & Recent */}
        <div className="space-y-8">
          {/* Practice Feature */}
          <div className="glass-dark rounded-[3rem] p-10 border border-white/5 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20">
                <Sparkles size={24} className="text-vox-accent" />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-light tracking-tighter">Practice Ritual</h3>
                <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest">Master specific sounds</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Target Word</label>
                <input 
                  type="text"
                  value={practiceWord}
                  onChange={(e) => setPracticeWord(e.target.value)}
                  placeholder="e.g. 'I am brave'"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-vox-accent transition-colors text-sm"
                />
                <p className="text-[10px] text-vox-paper/30 italic">Write a sentence, then hold the record button and speak it. I'll analyze your courage.</p>
              </div>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="glass-dark rounded-[3rem] p-10 border border-white/5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-vox-paper/5 flex items-center justify-center border border-white/10">
                  <History size={24} className="text-vox-paper/50" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-light tracking-tighter">Recent Notes</h3>
                  <p className="text-vox-paper/40 text-[10px] uppercase tracking-widest">Your journey</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {user.voiceNotes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-vox-paper/20 text-xs italic font-serif">No notes saved yet.</p>
                </div>
              ) : (
                user.voiceNotes.slice(0, 5).map((note) => (
                  <div key={note.id} className="glass p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-vox-accent/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        note.type === 'breath' ? 'bg-blue-500/10 text-blue-400' :
                        note.type === 'whisper' ? 'bg-vox-accent/10 text-vox-accent' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {note.type === 'breath' ? <Wind size={18} /> : 
                         note.type === 'whisper' ? <Mic size={18} /> : 
                         <Activity size={18} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold capitalize">{note.type}</div>
                        <div className="text-[10px] text-vox-paper/40">{formatTime(note.duration)} • {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (note.audioData) {
                          stopAllAudio();
                          const audio = new Audio(note.audioData);
                          audio.play().catch(err => console.error("Playback error:", err));
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-vox-accent hover:text-vox-bg"
                    >
                      <Play size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
    )}
  </div>
);
};

const CompanionMode = ({ onBack, user, setUser, safePlayPCM, stopAllAudio, setView }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, safePlayPCM: any, stopAllAudio: () => void, setView: (v: AppState) => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, id: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useVoice, setUseVoice] = useState(true);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [lastAudio, setLastAudio] = useState<string | null>(null);
  const [soundscape, setSoundscape] = useState<'none' | 'rain' | 'forest' | 'ocean'>('none');
  const [soundscapeVolume, setSoundscapeVolume] = useState(0.2);
  const [avatar, setAvatar] = useState('serenity');
  const [sessionActive, setSessionActive] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startSession = async () => {
    stopAllAudio();
    setSessionActive(true);
    setIsLoading(true);
    const intro = await generateCompanionResponse("I am entering the sanctuary. Please welcome me with a warm, inviting, and comforting message.", []);
    if (intro) {
      setMessages([{ role: 'model', text: intro, id: Math.random().toString(36).substr(2, 9) }]);
      if (useVoice) {
        setIsSpeaking(true);
        const audioBase64 = await generateSpeech(intro);
        if (audioBase64) {
          setLastAudio(audioBase64);
          await safePlayPCM(audioBase64, 24000, () => setIsSpeaking(false), voiceVolume);
        } else {
          setIsSpeaking(false);
        }
      }
    }
    setIsLoading(false);
  };

  const endSession = () => {
    stopAllAudio();
    setSessionActive(false);
    setMessages([]);
    setSoundscape('none');
  };

  const saveToEcho = (text: string) => {
    const newNote: VoiceNote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: 0,
      type: 'companion',
      isPrivate: true,
      text: text,
      audioData: lastAudio || undefined
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newNote, ...(prev.voiceNotes || [])]
      };
    });
  };

  const saveFullConversation = () => {
    if (messages.length === 0) return;
    
    // Also save as a long voice note/journal entry if preferred
    const fullText = messages.map(m => `${m.role === 'user' ? 'Me' : 'Companion'}: ${m.text}`).join('\n\n');
    const newJournalEntry: JournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      prompt: "Companion Session Summary",
      response: fullText
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        journalEntries: [newJournalEntry, ...(prev.journalEntries || [])]
      };
    });

    // Also save to Echo Chamber (Voice Notes)
    const newVoiceNote: VoiceNote = {
      id: `companion-note-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: 0,
      type: 'companion',
      isPrivate: true,
      text: fullText
    };

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        voiceNotes: [newVoiceNote, ...(prev.voiceNotes || [])]
      };
    });
  };

  const avatars = [
    { id: 'serenity', name: 'Serenity', img: 'https://picsum.photos/seed/ethereal-presence/200' },
    { id: 'wisdom', name: 'Wisdom', img: 'https://picsum.photos/seed/ancient-calm/200' },
    { id: 'bloom', name: 'Bloom', img: 'https://picsum.photos/seed/voice-blossom/200' },
  ];

  const soundscapes = [
    { id: 'none', name: 'Silence', icon: Wind },
    { id: 'rain', name: 'Rain', icon: CloudRain, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'forest', name: 'Forest', icon: TreePine, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'ocean', name: 'Ocean', icon: Waves, url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    if (soundscape !== 'none') {
      const url = soundscapes.find(s => s.id === soundscape)?.url;
      if (url) {
        if (!audioRef.current || audioRef.current.src !== url) {
          if (audioRef.current) audioRef.current.pause();
          audioRef.current = new Audio(url);
          audioRef.current.loop = true;
          audioRef.current.onerror = (e) => {
            console.error("Soundscape load error:", e);
          };
        }
        audioRef.current.volume = soundscapeVolume;
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio play error:", e);
          }
        });
      }
    } else {
      audioRef.current?.pause();
    }
    return () => audioRef.current?.pause();
  }, [soundscape, soundscapeVolume]);

  const playRawAudio = async (base64Audio: string, sampleRate: number = 24000) => {
    await safePlayPCM(base64Audio, sampleRate, () => setIsSpeaking(false), voiceVolume);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionActive) return;
    const userMsg = input;

    // Check for safe word
    if (user.safeWord && userMsg.toLowerCase().includes(user.safeWord.toLowerCase())) {
      setView('anchor');
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, id: Math.random().toString(36).substr(2, 9) }]);
    setIsLoading(true);
    // Greeting complete

    const history = messages.slice(-10).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const response = await generateCompanionResponse(userMsg, history);
    
    if (response) {
      const modelMsg = { role: 'model' as const, text: response, id: Math.random().toString(36).substr(2, 9) };
      setMessages(prev => [...prev, modelMsg]);
      setIsLoading(false);
      
      // Save to history automatically
      setUser(prev => {
        if (!prev) return null;
        return { ...prev };
      });

      // Generate and play speech
      if (useVoice) {
        setIsSpeaking(true);
        try {
          const audioBase64 = await generateSpeech(response);
          if (audioBase64) {
            setLastAudio(audioBase64);
            await playRawAudio(audioBase64);
          } else {
            setIsSpeaking(false);
          }
        } catch (err) {
          console.error("Speech generation error:", err);
          setIsSpeaking(false);
        }
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => { stopAllAudio(); onBack(); }} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="flex items-center gap-6">
          {sessionActive && (
            <div className="flex items-center gap-2">
              <button 
                onClick={saveFullConversation}
                className="px-4 py-1.5 rounded-full bg-vox-accent/10 text-vox-accent border border-vox-accent/20 text-[10px] uppercase tracking-widest font-bold hover:bg-vox-accent/20 transition-all flex items-center gap-2"
              >
                <Save size={12} /> Save Session
              </button>
              <button 
                onClick={endSession}
                className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-bold hover:bg-red-500/20 transition-all"
              >
                End Session
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setUseVoice(!useVoice)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold ${useVoice ? 'bg-vox-accent/20 text-vox-accent border border-vox-accent/30' : 'bg-white/5 text-vox-paper/30 border border-white/10'}`}
            >
              {useVoice ? <Volume2 size={12} /> : <VolumeX size={12} />}
              {useVoice ? 'Voice On' : 'Voice Off'}
            </button>
            {useVoice && (
              <div className="flex items-center gap-2">
                <Volume2 size={10} className="text-vox-paper/30" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={voiceVolume} 
                  onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-vox-accent"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {soundscapes.map(s => (
              <button 
                key={s.id}
                onClick={() => setSoundscape(s.id as any)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${soundscape === s.id ? 'bg-vox-accent text-vox-bg' : 'bg-white/5 text-vox-paper/40 hover:bg-white/10'}`}
                title={s.name}
              >
                <s.icon size={14} />
              </button>
            ))}
            {soundscape !== 'none' && (
              <div className="flex items-center gap-2 ml-2">
                <Volume2 size={10} className="text-vox-paper/30" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={soundscapeVolume} 
                  onChange={(e) => setSoundscapeVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-vox-accent"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-vox-accent animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-xs uppercase tracking-widest font-semibold">
              {isSpeaking ? 'Companion Speaking...' : 'Courage Companion'}
            </span>
          </div>
        </div>
      </header>

      {!sessionActive ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md"
          >
            <div className="w-24 h-24 rounded-full bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
              <Sparkles size={40} className="text-vox-accent" />
            </div>
            <h2 className="text-4xl font-light tracking-tighter mb-4">Begin Your Conversation</h2>
            <p className="text-vox-paper/40 mb-12 font-serif italic">
              Your Courage Companion is ready to listen. Start a session to enter the digital sanctuary.
            </p>
            <button 
              onClick={startSession}
              className="px-12 py-5 bg-vox-accent text-vox-bg rounded-full font-bold text-sm uppercase tracking-widest shadow-2xl shadow-vox-accent/20 hover:scale-105 transition-all"
            >
              Start Session
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 flex gap-8 overflow-hidden mb-8">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col glass-dark rounded-[3rem] p-8 relative overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-8 mb-4 pr-4 scrollbar-hide">
            {messages.map((m, i) => (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <motion.div 
                  animate={isSpeaking && i === messages.length - 1 && m.role === 'model' ? {
                    boxShadow: ['0 0 0px rgba(255,78,0,0)', '0 0 20px rgba(255,78,0,0.3)', '0 0 0px rgba(255,78,0,0)'],
                    borderColor: ['rgba(255,255,255,0.05)', 'rgba(255,78,0,0.4)', 'rgba(255,255,255,0.05)']
                  } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`relative group max-w-[85%] p-6 rounded-3xl border ${m.role === 'user' ? 'bg-vox-accent text-vox-bg font-medium rounded-tr-none shadow-lg shadow-vox-accent/20 border-transparent' : 'bg-white/5 rounded-tl-none font-serif text-lg italic border-white/5'}`}
                >
                  {m.text}
                  {m.role === 'model' && (
                    <button 
                      onClick={() => saveToEcho(m.text)}
                      className="absolute -right-12 top-0 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-vox-accent hover:text-vox-bg border border-white/10"
                      title="Save to Echo Chamber"
                    >
                      <Heart size={16} />
                    </button>
                  )}
                </motion.div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-6 rounded-3xl rounded-tl-none border border-white/5">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-vox-accent rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-vox-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-vox-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            {isUserTyping && (
              <div className="flex justify-end">
                <div className="bg-vox-accent/10 p-4 rounded-2xl rounded-tr-none border border-vox-accent/20">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-vox-accent rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-vox-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-vox-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setIsUserTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsUserTyping(false), 1500);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your feelings..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 pr-16 focus:outline-none focus:border-vox-accent transition-colors"
            />
            <button 
              onClick={handleSend}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-vox-accent text-vox-bg rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar: Avatar & Settings */}
        <div className="w-64 flex flex-col gap-6">
          <div className="glass-dark rounded-[2.5rem] p-6 text-center border border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 mb-4 font-bold">Companion Avatar</div>
            <div className="relative w-32 h-32 mx-auto mb-6">
              <motion.div
                animate={isSpeaking ? { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] } : { opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-vox-accent blur-xl"
              />
              <motion.img 
                key={avatar}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isSpeaking ? { 
                  opacity: 1, 
                  scale: [1, 1.05, 1],
                  borderColor: ['rgba(255,78,0,0.2)', 'rgba(255,78,0,0.8)', 'rgba(255,78,0,0.2)']
                } : { opacity: 1, scale: 1 }}
                transition={isSpeaking ? { repeat: Infinity, duration: 1.5 } : { duration: 0.5 }}
                src={avatars.find(a => a.id === avatar)?.img} 
                className="relative z-10 w-full h-full rounded-full object-cover border-4 border-vox-accent/20 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              {isUserTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -bottom-2 -right-2 bg-vox-accent text-vox-bg p-2 rounded-full shadow-lg z-20"
                >
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-vox-bg rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-vox-bg rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-vox-bg rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </motion.div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-vox-accent flex items-center justify-center border-4 border-vox-bg z-10">
                <Sparkles size={12} className="text-vox-bg" />
              </div>
            </div>
            <div className="flex justify-center gap-2">
              {avatars.map(a => (
                <button 
                  key={a.id}
                  onClick={() => setAvatar(a.id)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${avatar === a.id ? 'border-vox-accent scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}
                >
                  <img src={a.img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          <div className="glass-dark rounded-[2.5rem] p-6 border border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 mb-4 font-bold">Sentiment Focus</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-vox-paper/60">Empathy Level</span>
                <span className="text-vox-accent font-bold">High</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="w-[90%] h-full bg-vox-accent" />
              </div>
              <p className="text-[10px] text-vox-paper/30 leading-relaxed italic">
                The AI is currently tailoring responses to a "Vulnerable" mood state.
              </p>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

const PresenceMode = ({ onBack }: { onBack: () => void }) => {
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isHolding) {
      const heartbeat = () => {
        if (navigator.vibrate) {
          // Subtle heartbeat pattern: pulse-pause-pulse-long pause
          navigator.vibrate([80, 100, 80]);
        }
      };
      heartbeat();
      interval = setInterval(heartbeat, 1200);

      // Challenge completion after 10 seconds of holding
      holdTimerRef.current = setTimeout(() => {
      // Breath complete
      }, 10000);
    } else {
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
      clearInterval(interval);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    }
    return () => {
      clearInterval(interval);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [isHolding]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 vox-gradient opacity-40" />
      
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Exit Presence
      </button>

      <div className="relative z-10 text-center max-w-md">
        <motion.div 
          animate={{ 
            scale: isHolding ? [1, 1.05, 1] : 1,
            opacity: isHolding ? [0.6, 1, 0.6] : 0.6
          }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="mb-12"
        >
          <Wind size={80} className="mx-auto text-blue-400/50" />
        </motion.div>
        
        <h2 className="text-4xl mb-6">Just Be</h2>
        <p className="text-vox-paper/50 font-serif italic mb-16">
          No tasks. No questions. Hold the button to feel a shared heartbeat with someone else in the silence.
        </p>

        <motion.button 
          onMouseDown={() => setIsHolding(true)}
          onMouseUp={() => setIsHolding(false)}
          onTouchStart={() => setIsHolding(true)}
          onTouchEnd={() => setIsHolding(false)}
          whileTap={{ scale: 0.95 }}
          className={`w-48 h-48 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-4 ${isHolding ? 'border-vox-accent bg-vox-accent/10' : 'border-white/10 bg-white/5'}`}
        >
          <Heart size={32} className={isHolding ? 'text-vox-accent animate-pulse' : 'text-vox-paper/20'} />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Hold for Presence</span>
        </motion.button>
      </div>

      {isHolding && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-vox-accent text-sm font-mono animate-pulse">
          Heartbeat Synced
        </div>
      )}
    </div>
  );
};

const FearMap = ({ data }: { data: { rejection: number, conflict: number, misunderstanding: number, vulnerability: number } }) => {
  const categories = [
    { key: 'rejection', label: 'Rejection', icon: Heart },
    { key: 'conflict', label: 'Conflict', icon: Zap },
    { key: 'misunderstanding', label: 'Misunderstanding', icon: CloudFog },
    { key: 'vulnerability', label: 'Vulnerability', icon: Shield },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map(({ key, label, icon: Icon }) => {
        const value = (data as any)[key] || 0;
        return (
          <div key={key} className="glass-dark p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <Icon size={14} className="text-vox-accent/50" />
              <span className="text-[10px] font-bold text-vox-paper/30 uppercase tracking-widest">{label}</span>
            </div>
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className="absolute inset-0 bg-vox-accent"
              />
            </div>
            <div className="mt-2 text-right text-[10px] font-mono text-vox-accent">{value}%</div>
          </div>
        );
      })}
    </div>
  );
};

const BridgeCompletionScreen = ({ onBack, onReturn }: { onBack: () => void, onReturn: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
    <div className="absolute inset-0 bg-vox-accent/5 vox-gradient opacity-40" />
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl w-full glass-dark p-12 rounded-[4rem] border border-vox-accent/20 text-center relative z-10"
    >
      <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center border border-vox-accent/20 mx-auto mb-8">
        <CheckCircle2 size={48} className="text-vox-accent" />
      </div>
      <h2 className="text-5xl font-light tracking-tighter mb-6">You're Ready.</h2>
      <p className="text-vox-paper/60 text-xl font-serif italic mb-12 leading-relaxed">
        "The bridge has been crossed. You've found your voice here so you can use it out there. This screen is your safety net—if you feel lost again, we're here. But for now, take a breath and speak your truth to the world."
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={onBack}
          className="py-4 bg-vox-paper text-vox-bg rounded-2xl font-bold hover:scale-105 transition-all"
        >
          Exit to Real Life
        </button>
        <button 
          onClick={onReturn}
          className="py-4 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-all text-vox-paper/40"
        >
          I'm not ready yet
        </button>
      </div>
    </motion.div>
  </div>
);

const BelovedBridge = ({ onBack, onExitToEmergency, safePlayPCM, stopAllAudio }: { onBack: () => void, onExitToEmergency: () => void, safePlayPCM: (b: string, s?: number, o?: () => void) => Promise<any>, stopAllAudio: () => void }) => {
  const [step, setStep] = useState<'select' | 'ghost'>('select');
  const [persona, setPersona] = useState('');
  const [message, setMessage] = useState('');
  const [practiceResponse, setPracticeResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcmPlayerRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopAllAudio();
    };
  }, []);

  const startGhostMode = async () => {
    if (!message.trim()) return;
    setIsLoading(true);
    // Practice complete
    setAudioBase64(null);
    const response = await ghostModePractice(message, persona);
    setPracticeResponse(response);
    setIsLoading(false);
    
    if (response?.confidenceScore > 0.8) {
      setTimeout(() => {
        onExitToEmergency();
      }, 3000); // Give them a few seconds to see the result
    }
    
    setStep('ghost');
    
    // Do not auto-generate audio for the reaction as per user request
    // if (response?.personaReaction) {
    //   handlePlayAudio(response.personaReaction);
    // }
  };

  const handlePlayAudio = async (text: string) => {
    if (audioBase64) {
      setIsSpeaking(true);
      const player = await safePlayPCM(audioBase64, 24000, () => setIsSpeaking(false));
      if (player) pcmPlayerRef.current = player;
      return;
    }

    setIsAudioLoading(true);
    const base64 = await generateSpeech(text, persona === 'Parent' ? 'Charon' : persona === 'Colleague' ? 'Puck' : 'Zephyr');
    if (base64) {
      setAudioBase64(base64);
      setIsSpeaking(true);
      const player = await safePlayPCM(base64, 24000, () => setIsSpeaking(false));
      if (player) pcmPlayerRef.current = player;
    }
    setIsAudioLoading(false);
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto pt-24">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-3xl font-light tracking-tight">Beloved Bridge™</h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-vox-accent font-bold">Real-World Connection Builder</p>
        </div>
      </header>

      {step === 'select' ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="glass-dark p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-vox-accent/5 blur-[100px] rounded-full -mr-32 -mt-32" />
            
            <div className="relative z-10 mb-12">
              <h3 className="text-4xl font-light tracking-tighter mb-4">Practice Vulnerability</h3>
              <p className="text-vox-paper/40 font-serif italic text-lg leading-relaxed">
                A safe scaffold for emotional growth. Rehearse difficult conversations with AI before you step back into your real-life relationships.
              </p>
            </div>

            <div className="space-y-10 relative z-10">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-6">1. Choose your connection</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Partner', 'Parent', 'Friend', 'Colleague'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setPersona(p)}
                      className={`py-4 rounded-2xl border transition-all text-sm font-medium ${persona === p ? 'bg-vox-accent border-vox-accent text-white shadow-lg shadow-vox-accent/20' : 'border-white/5 bg-white/5 hover:bg-white/10 text-vox-paper/60'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-6">2. Draft your message</h4>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you want to say? Be as honest as you can..."
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-[2rem] p-8 focus:outline-none focus:border-vox-accent transition-colors text-lg leading-relaxed placeholder:text-vox-paper/20"
                />
              </div>

              <button 
                onClick={startGhostMode}
                disabled={!persona || !message}
                className="w-full py-6 bg-vox-paper text-vox-bg rounded-[2rem] font-bold uppercase tracking-[0.3em] text-xs disabled:opacity-30 flex items-center justify-center gap-3 shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-vox-bg border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Enter Ghost Mode Practice <Zap size={16} /></>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <Ghost size={20} className="text-vox-accent" />
              </div>
              <h4 className="text-sm font-bold mb-3 uppercase tracking-wider">Ghost Mode</h4>
              <p className="text-xs text-vox-paper/40 leading-relaxed">Rehearse with a simulated persona to see likely reactions and refine your approach.</p>
            </div>
            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <Clock size={20} className="text-vox-accent" />
              </div>
              <h4 className="text-sm font-bold mb-3 uppercase tracking-wider">Drafting & Timing</h4>
              <p className="text-xs text-vox-paper/40 leading-relaxed">Get suggestions on the best time to reach out based on your emotional state.</p>
            </div>
            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                <LogOut size={20} className="text-vox-accent" />
              </div>
              <h4 className="text-sm font-bold mb-3 uppercase tracking-wider">Anti-Dependency</h4>
              <p className="text-xs text-vox-paper/40 leading-relaxed">We celebrate when you step away from the screen and into a real human connection.</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 pb-24">
          {showCelebration ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-dark p-12 rounded-[4rem] border border-vox-accent/20 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-vox-accent/5 blur-[100px] rounded-full" />
              <div className="relative z-10">
                <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/20 flex items-center justify-center mx-auto mb-10 border border-vox-accent/30">
                  <Heart size={48} className="text-vox-accent animate-pulse" />
                </div>
                <h3 className="text-5xl font-light tracking-tighter mb-6">Courage in Action</h3>
                <p className="text-vox-paper/60 font-serif italic text-2xl mb-12 max-w-2xl mx-auto leading-relaxed">
                  {practiceResponse?.realWorldCelebration || "You've practiced well. The next step is the most courageous one—connecting for real."}
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => {
                      setShowCelebration(false);
                      onExitToEmergency();
                    }}
                    className="px-12 py-5 bg-vox-accent text-white rounded-full font-bold uppercase tracking-[0.3em] text-xs shadow-xl shadow-vox-accent/20 hover:scale-105 transition-all"
                  >
                    I've Reached Out
                  </button>
                  <button 
                    onClick={() => setShowCelebration(false)}
                    className="px-12 py-5 border border-white/10 rounded-full font-bold uppercase tracking-[0.3em] text-xs hover:bg-white/5 transition-all"
                  >
                    Not Yet
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div className="glass-dark p-10 rounded-[3rem] border border-white/5 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-vox-accent/5 blur-[60px] rounded-full -mr-16 -mt-16" />
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="text-[10px] uppercase tracking-[0.4em] text-vox-accent font-bold">Likely Reaction from {persona}</div>
                    <button 
                      onClick={() => handlePlayAudio(practiceResponse?.personaReaction)}
                      disabled={isAudioLoading}
                      className="w-12 h-12 rounded-2xl bg-vox-accent/10 text-vox-accent flex items-center justify-center hover:bg-vox-accent/20 transition-all disabled:opacity-50 border border-vox-accent/20"
                    >
                      {isAudioLoading ? (
                        <div className="w-5 h-5 border-2 border-vox-accent border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Volume2 size={20} />
                      )}
                    </button>
                  </div>
                  <div className="font-serif text-3xl italic leading-relaxed text-vox-paper/90 relative z-10">
                    "{practiceResponse?.personaReaction}"
                  </div>
                </div>

                <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
                  <div className="flex items-center justify-between mb-10">
                    <div className="text-[10px] uppercase tracking-[0.4em] text-vox-paper/30 font-bold">Analysis & Refinement</div>
                    {practiceResponse?.confidenceScore && (
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] uppercase tracking-[0.4em] text-vox-paper/30 font-bold">Readiness</span>
                        <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${practiceResponse.confidenceScore * 100}%` }}
                            className={`absolute inset-y-0 left-0 ${practiceResponse.confidenceScore > 0.8 ? 'bg-emerald-400' : 'bg-vox-accent'}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-10">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-4">The Insight</h4>
                      <p className="text-vox-paper/70 leading-relaxed text-lg italic font-serif">
                        {practiceResponse?.analysis}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                          <Sparkles size={14} /> Actionable Tips
                        </h4>
                        <ul className="space-y-4">
                          {practiceResponse?.actionableAdvice?.map((tip: string, i: number) => (
                            <li key={i} className="text-sm flex gap-4 text-vox-paper/60 leading-relaxed">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-vox-accent flex items-center gap-2">
                          <Clock size={14} /> Timing Advice
                        </h4>
                        <div className="p-6 rounded-2xl bg-vox-accent/5 border border-vox-accent/10 text-sm text-vox-paper/70 leading-relaxed italic">
                          {practiceResponse?.timingAdvice || "Wait for a quiet moment when you both feel grounded."}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-6">Drafting Suggestions</h4>
                      <div className="space-y-4">
                        {practiceResponse?.draftingSuggestions?.map((draft: string, i: number) => (
                          <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 text-sm text-vox-paper/80 leading-relaxed relative group">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(draft);
                                // Could add a toast here
                              }}
                              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-vox-paper/30 hover:text-vox-accent"
                            >
                              <Copy size={14} />
                            </button>
                            "{draft}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                {practiceResponse?.fearMap && (
                  <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vox-accent mb-8">Fear Map</h4>
                    <FearMap data={practiceResponse.fearMap} />
                  </div>
                )}

                <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 bg-vox-accent/5">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-vox-accent mb-6">Your Strengths</h4>
                  <ul className="space-y-4">
                    {practiceResponse?.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-xs flex gap-3 text-vox-paper/70 leading-relaxed">
                        <Heart size={14} className="text-vox-accent shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 italic text-sm text-vox-paper/40 text-center leading-relaxed">
                  "{practiceResponse?.encouragement}"
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setShowCelebration(true)}
                    className="w-full py-6 bg-vox-accent text-white rounded-[2rem] font-bold uppercase tracking-[0.3em] text-xs shadow-xl shadow-vox-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    I'm Ready to Connect
                  </button>
                  <button 
                    onClick={() => setStep('select')}
                    className="w-full py-6 border border-white/10 rounded-[2rem] font-bold uppercase tracking-[0.3em] text-xs text-vox-paper/40 hover:bg-white/5 transition-all"
                  >
                    Refine Draft
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const Journal = ({ onBack, user, setUser, setView }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>>, setView: (v: AppState) => void }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
          mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const dataUrl = reader.result as string;
              const base64Audio = dataUrl.split(',')[1];
              setIsTranscribing(true);
              try {
                const text = await transcribeAudio(base64Audio, 'audio/webm');
                if (text) {
                  // Check for safe word
                  if (user.safeWord && text.toLowerCase().includes(user.safeWord.toLowerCase())) {
                    setView('anchor');
                    return;
                  }
                  setResponse(prev => prev ? prev + " " + text : text);
                }
              } catch (err) {
                console.error("Transcription error:", err);
              } finally {
                setIsTranscribing(false);
              }
            };
          };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic access error:", err);
      setMicError(err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' 
        ? "No microphone found. Please connect a device and try again." 
        : "Microphone access denied. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const getNewPrompt = async () => {
    setIsGenerating(true);
    
    // Build rich context from mood history and past entries
    const journalContext = user.journalEntries?.slice(0, 5).map(e => `Prompt: ${e.prompt}\nResponse: ${e.response}`).join("\n---\n") || "";
    const moodContext = user.moodHistory?.slice(0, 10).map(m => {
      const date = new Date(m.timestamp).toLocaleDateString();
      return `${date}: ${m.mood}${m.note ? ` (Note: ${m.note})` : ''}`;
    }).join("\n") || "";
    
    const fullContext = `
      USER PROFILE & HISTORY:
      - Current Courage Level: ${user.courageLevel}/100
      - Daily Intention: ${user.dailyIntention || "Not set"}
      
      RECENT MOODS:
      ${moodContext || "No mood data yet."}
      
      PAST REFLECTIONS:
      ${journalContext || "No past entries yet."}
    `.trim();

    const newPrompt = await generateJournalPrompt(fullContext);
    setPrompt(newPrompt || "What is one small way you can show yourself courage today?");
    setIsGenerating(false);
    setResponse('');
  };

  useEffect(() => {
    getNewPrompt();
  }, []);

  const saveEntry = () => {
    if (!response.trim()) return;
    setIsSaving(true);
    const newEntry: JournalEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      prompt,
      response,
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        journalEntries: [newEntry, ...(prev.journalEntries || [])]
      };
    });
    // Journal complete
    setIsSaving(false);
    setShowHistory(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-hidden pt-24">
      <div className="absolute inset-0 vox-gradient opacity-30" />
      
      <div className="absolute top-10 left-10 z-20 flex gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Back to Sanctuary
        </button>
        <button 
          onClick={() => setShowHistory(!showHistory)} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${showHistory ? 'bg-vox-accent text-white' : 'text-vox-paper/50 hover:text-vox-paper bg-white/5'}`}
        >
          <History size={18} /> {showHistory ? "Journal History" : "Journal History"}
        </button>
        {!showHistory && response.trim() && (
          <button 
            onClick={saveEntry}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-vox-accent/20 text-vox-accent border border-vox-accent/30 hover:bg-vox-accent hover:text-vox-bg transition-all font-bold text-xs uppercase tracking-widest"
          >
            <CheckCircle2 size={18} /> {isSaving ? "Saving..." : "Save Now"}
          </button>
        )}
      </div>

      <div className="absolute top-10 right-10 z-20 flex items-center gap-2 text-vox-paper/30 text-[10px] uppercase tracking-widest font-bold">
        <Lock size={12} className="text-vox-accent" /> Private & Encrypted
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-4xl glass-dark rounded-[3rem] p-12 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <h2 className="text-3xl mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-vox-accent" /> Your Courage Journal
              </div>
              <div className="text-xs font-mono text-vox-paper/30 uppercase tracking-widest">
                {user.journalEntries?.length || 0} Reflections
              </div>
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-hide">
              {(!user.journalEntries || user.journalEntries.length === 0) ? (
                <div className="text-center py-20 text-vox-paper/30 italic">
                  Your journal is empty. Start reflecting to see your growth here.
                </div>
              ) : (
                user.journalEntries.map((entry) => (
                  <div key={entry.id} className="bg-white/5 rounded-3xl p-8 border border-white/5 hover:border-vox-accent/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-vox-accent font-mono text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      <Lock size={12} className="text-vox-paper/20" />
                    </div>
                    <h4 className="text-xl font-serif italic mb-4 text-vox-paper/90">"{entry.prompt}"</h4>
                    <div className="text-vox-paper/60 leading-relaxed whitespace-pre-wrap font-serif">
                      <Markdown>{entry.response}</Markdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="write"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-3xl"
          >
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-3xl bg-vox-accent/10 flex items-center justify-center mx-auto mb-6 border border-vox-accent/20">
                <BookOpen size={40} className="text-vox-accent" />
              </div>
              <h2 className="text-4xl mb-4">Guided Reflection</h2>
              <p className="text-vox-paper/50 font-serif italic">Take a moment to breathe and listen to your inner voice.</p>
            </div>

            <div className="glass-dark rounded-[3rem] p-12 border border-white/5 relative overflow-hidden">
              {isGenerating ? (
                <div className="py-20 flex flex-col items-center gap-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-2 border-vox-accent/30 border-t-vox-accent rounded-full"
                  />
                  <p className="text-vox-paper/30 font-mono text-xs uppercase tracking-widest">Generating prompt...</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="relative">
                    <span className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-vox-accent font-bold">The Prompt</span>
                    <h3 className="text-2xl md:text-3xl font-serif italic leading-tight text-vox-paper/90">
                      {prompt}
                    </h3>
                    <div className="mt-6 flex gap-4">
                      <button 
                        onClick={getNewPrompt}
                        className="px-6 py-2 bg-vox-accent/10 border border-vox-accent/30 text-vox-accent rounded-full text-xs font-bold uppercase tracking-widest hover:bg-vox-accent hover:text-vox-bg transition-all flex items-center gap-2"
                      >
                        <Sparkles size={14} /> Generate New Prompt
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute -top-6 left-0 text-[10px] uppercase tracking-widest text-vox-paper/30">Your Reflection</span>
                    <textarea 
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      placeholder="Let your thoughts flow freely..."
                      className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-lg font-serif focus:outline-none focus:border-vox-accent transition-all h-64 resize-none placeholder:text-vox-paper/20"
                    />
                    <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
                      {micError && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] flex items-center gap-2 max-w-[200px]"
                        >
                          <AlertCircle size={12} />
                          {micError}
                        </motion.div>
                      )}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-vox-accent text-vox-bg hover:scale-105'}`}
                        title={isRecording ? "Stop Recording" : "Voice to Text"}
                      >
                        {isTranscribing ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-vox-bg/30 border-t-vox-bg rounded-full"
                          />
                        ) : isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={saveEntry}
                    disabled={!response.trim() || isSaving}
                    className="w-full py-6 bg-vox-accent text-white rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 shadow-xl shadow-vox-accent/20"
                  >
                    {isSaving ? "Saving to Journal..." : "Save Reflection"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnchorMode = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [activeTab, setActiveTab] = useState<'grounding' | 'contacts'>('grounding');
  const [exercise, setExercise] = useState<'none' | 'breathing' | 'sensory' | 'muscle' | 'visualization'>('none');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [alertStatus, setAlertStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [sensoryStep, setSensoryStep] = useState(0);
  const [muscleStep, setMuscleStep] = useState(0);
  const [visualizationStep, setVisualizationStep] = useState(0);

  const sensoryPrompts = [
    { count: 5, label: "Things you can see", icon: Eye },
    { count: 4, label: "Things you can touch", icon: Hand },
    { count: 3, label: "Things you can hear", icon: Volume2 },
    { count: 2, label: "Things you can smell", icon: Wind },
    { count: 1, label: "Thing you can taste", icon: Utensils }
  ];

  const muscleSteps = [
    { label: "Shoulders & Neck", instruction: "Tense your shoulders up to your ears... hold it tightly.", icon: Activity },
    { label: "Release", instruction: "Let them drop. Feel the tension melting away completely.", icon: Sparkles },
    { label: "Hands & Arms", instruction: "Make tight fists. Squeeze your arms... hold it.", icon: Activity },
    { label: "Release", instruction: "Open your hands. Let your arms feel heavy and relaxed.", icon: Sparkles },
    { label: "Feet & Legs", instruction: "Curl your toes. Tense your leg muscles... hold it.", icon: Activity },
    { label: "Release", instruction: "Let go. Feel the ground supporting your weight.", icon: Sparkles }
  ];

  const visualizationSteps = [
    { label: "The Setting", instruction: "Close your eyes. Imagine a place where you feel completely safe and at peace.", icon: TreePine },
    { label: "Sight", instruction: "What do you see? Notice the colors, the light, the details of your surroundings.", icon: Eye },
    { label: "Sound", instruction: "What do you hear? Is it quiet, or are there gentle sounds like waves or rustling leaves?", icon: Volume2 },
    { label: "Smell", instruction: "What do you smell? The fresh air, a familiar scent, or something comforting?", icon: Wind },
    { label: "Feeling", instruction: "How does it feel? The temperature, the texture of where you are sitting or standing.", icon: Hand },
    { label: "Presence", instruction: "Stay here for a moment. This sanctuary is always within you, whenever you need it.", icon: Heart }
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (exercise === 'breathing') {
      const cycle = () => {
        setBreathingPhase('Inhale');
        timer = setTimeout(() => {
          setBreathingPhase('Hold');
          timer = setTimeout(() => {
            setBreathingPhase('Exhale');
            timer = setTimeout(cycle, 4000);
          }, 4000);
        }, 4000);
      };
      cycle();
    }
    return () => clearTimeout(timer);
  }, [exercise]);

  const addContact = () => {
    if (!newContactName || !newContactPhone) return;
    const contact: EmergencyContact = {
      id: Math.random().toString(36).substr(2, 9),
      name: newContactName,
      phone: newContactPhone
    };
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        emergencyContacts: [...(prev.emergencyContacts || []), contact]
      };
    });
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContact(false);
  };

  const removeContact = (id: string) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        emergencyContacts: (prev.emergencyContacts || []).filter(c => c.id !== id)
      };
    });
  };

  const sendAlert = () => {
    setAlertStatus('sending');
    setTimeout(() => {
      setAlertStatus('sent');
      setTimeout(() => setAlertStatus('idle'), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-red-950/90 backdrop-blur-xl flex flex-col p-6 overflow-y-auto pt-24 pb-32">
      <div className="max-w-md mx-auto w-full flex flex-col items-center">
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6"
        >
          <Shield size={40} className="text-red-500" />
        </motion.div>
        
        <h2 className="text-3xl mb-2 font-light tracking-tight text-white">Anchor Mode</h2>
        <p className="text-vox-paper/60 font-serif italic text-sm mb-8 text-center">
          You are safe. You are here. Let's find your center.
        </p>

        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-8 w-full">
          <button 
            onClick={() => { setActiveTab('grounding'); setExercise('none'); }}
            className={`flex-1 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'grounding' ? 'bg-vox-accent text-vox-bg' : 'text-vox-paper/40 hover:text-vox-paper'}`}
          >
            Grounding
          </button>
          <button 
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all ${activeTab === 'contacts' ? 'bg-vox-accent text-vox-bg' : 'text-vox-paper/40 hover:text-vox-paper'}`}
          >
            Safety Net
          </button>
        </div>

        {activeTab === 'grounding' && (
          <div className="w-full space-y-6">
            {exercise === 'none' && (
              <div className="grid grid-cols-1 gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExercise('breathing')}
                  className="p-8 glass-dark rounded-[2.5rem] flex flex-col items-center gap-4 border border-white/5 text-center group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-vox-accent/10 flex items-center justify-center text-vox-accent group-hover:bg-vox-accent group-hover:text-vox-bg transition-all">
                    <Wind size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic mb-1">Guided Breathing</h3>
                    <p className="text-xs text-vox-paper/40 uppercase tracking-widest">4-4-4 Box Pattern</p>
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setExercise('sensory'); setSensoryStep(0); }}
                  className="p-8 glass-dark rounded-[2.5rem] flex flex-col items-center gap-4 border border-white/5 text-center group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <Eye size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic mb-1">Sensory Focus</h3>
                    <p className="text-xs text-vox-paper/40 uppercase tracking-widest">5-4-3-2-1 Technique</p>
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setExercise('muscle'); setMuscleStep(0); }}
                  className="p-8 glass-dark rounded-[2.5rem] flex flex-col items-center gap-4 border border-white/5 text-center group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <Activity size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic mb-1">Muscle Release</h3>
                    <p className="text-xs text-vox-paper/40 uppercase tracking-widest">Progressive Relaxation</p>
                  </div>
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setExercise('visualization'); setVisualizationStep(0); }}
                  className="p-8 glass-dark rounded-[2.5rem] flex flex-col items-center gap-4 border border-white/5 text-center group"
                >
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <TreePine size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic mb-1">Safe Sanctuary</h3>
                    <p className="text-xs text-vox-paper/40 uppercase tracking-widest">Guided Visualization</p>
                  </div>
                </motion.button>
              </div>
            )}

            {exercise === 'breathing' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-12"
              >
                <div className="relative w-64 h-64 flex items-center justify-center">
                  <motion.div 
                    animate={{ 
                      scale: breathingPhase === 'Inhale' ? 1.5 : breathingPhase === 'Hold' ? 1.5 : 1,
                      opacity: breathingPhase === 'Hold' ? 0.8 : 0.5
                    }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-vox-accent/20 border-2 border-vox-accent/30"
                  />
                  <div className="relative z-10 text-center">
                    <h4 className="text-4xl font-light tracking-tighter text-vox-accent mb-2">{breathingPhase}</h4>
                    <p className="text-xs uppercase tracking-[0.3em] text-vox-paper/40">Keep going</p>
                  </div>
                </div>
                <button 
                  onClick={() => setExercise('none')}
                  className="mt-16 text-xs uppercase tracking-widest font-bold text-vox-paper/40 hover:text-vox-paper"
                >
                  End Exercise
                </button>
              </motion.div>
            )}

            {exercise === 'sensory' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-dark p-10 rounded-[3rem] border border-white/5 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 text-vox-accent">
                  {React.createElement(sensoryPrompts[sensoryStep].icon, { size: 40 })}
                </div>
                <h4 className="text-5xl font-light tracking-tighter mb-4">{sensoryPrompts[sensoryStep].count}</h4>
                <p className="text-xl font-serif italic mb-12">{sensoryPrompts[sensoryStep].label}</p>
                
                <div className="flex gap-4">
                  {sensoryStep > 0 && (
                    <button 
                      onClick={() => setSensoryStep(s => s - 1)}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (sensoryStep < sensoryPrompts.length - 1) {
                        setSensoryStep(s => s + 1);
                      } else {
                        setExercise('none');
                      }
                    }}
                    className="flex-[2] py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    {sensoryStep < sensoryPrompts.length - 1 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </motion.div>
            )}

            {exercise === 'muscle' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-dark p-10 rounded-[3rem] border border-white/5 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-8 text-purple-400">
                  {React.createElement(muscleSteps[muscleStep].icon, { size: 40 })}
                </div>
                <h4 className="text-2xl font-serif italic mb-4">{muscleSteps[muscleStep].label}</h4>
                <p className="text-lg text-vox-paper/60 leading-relaxed mb-12">{muscleSteps[muscleStep].instruction}</p>
                
                <div className="flex gap-4">
                  {muscleStep > 0 && (
                    <button 
                      onClick={() => setMuscleStep(s => s - 1)}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (muscleStep < muscleSteps.length - 1) {
                        setMuscleStep(s => s + 1);
                      } else {
                        setExercise('none');
                      }
                    }}
                    className="flex-[2] py-4 bg-purple-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    {muscleStep < muscleSteps.length - 1 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </motion.div>
            )}

            {exercise === 'visualization' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-dark p-10 rounded-[3rem] border border-white/5 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-8 text-emerald-400">
                  {React.createElement(visualizationSteps[visualizationStep].icon, { size: 40 })}
                </div>
                <h4 className="text-2xl font-serif italic mb-4">{visualizationSteps[visualizationStep].label}</h4>
                <p className="text-lg text-vox-paper/60 leading-relaxed mb-12">{visualizationSteps[visualizationStep].instruction}</p>
                
                <div className="flex gap-4">
                  {visualizationStep > 0 && (
                    <button 
                      onClick={() => setVisualizationStep(s => s - 1)}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Back
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (visualizationStep < visualizationSteps.length - 1) {
                        setVisualizationStep(s => s + 1);
                      } else {
                        setExercise('none');
                      }
                    }}
                    className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    {visualizationStep < visualizationSteps.length - 1 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-red-400">Emergency Contacts</h3>
              <button 
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs text-vox-paper/40 hover:text-vox-paper flex items-center gap-1"
              >
                <Plus size={14} /> Add New
              </button>
            </div>

            {showAddContact && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4"
              >
                <input 
                  type="text" 
                  placeholder="Name" 
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent"
                />
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={addContact}
                    className="flex-1 py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    Save Contact
                  </button>
                  <button 
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              {(!user.emergencyContacts || user.emergencyContacts.length === 0) ? (
                <div className="p-12 text-center glass-dark rounded-[2.5rem] border border-white/5">
                  <Heart className="mx-auto mb-4 text-vox-paper/10" size={32} />
                  <p className="text-xs text-vox-paper/20 italic">Your safety net is empty. Add someone you trust.</p>
                </div>
              ) : (
                user.emergencyContacts.map(contact => (
                  <div key={contact.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
                    <div className="text-left">
                      <p className="text-base font-medium">{contact.name}</p>
                      <p className="text-xs text-vox-paper/40">{contact.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <a 
                        href={`tel:${contact.phone}`}
                        className="w-12 h-12 rounded-2xl bg-vox-accent/20 text-vox-accent flex items-center justify-center hover:bg-vox-accent hover:text-vox-bg transition-all"
                      >
                        <Phone size={18} />
                      </a>
                      <button 
                        onClick={() => removeContact(contact.id)}
                        className="w-12 h-12 rounded-2xl bg-white/5 text-vox-paper/20 flex items-center justify-center hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {user.emergencyContacts && user.emergencyContacts.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={sendAlert}
                disabled={alertStatus !== 'idle'}
                className={`w-full py-6 rounded-[2rem] font-bold uppercase tracking-widest text-sm shadow-2xl transition-all flex items-center justify-center gap-3 ${
                  alertStatus === 'sent' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white shadow-red-600/20'
                }`}
              >
                {alertStatus === 'idle' && <><Shield size={20} /> Alert All Contacts</>}
                {alertStatus === 'sending' && "Sending Alerts..."}
                {alertStatus === 'sent' && <><Check size={20} /> Alerts Sent</>}
              </motion.button>
            )}
          </div>
        )}

        <div className="mt-12 w-full">
          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-white/10 rounded-2xl font-bold uppercase tracking-widest text-xs text-vox-paper/60 hover:text-vox-paper transition-all" 
            onClick={onBack}
          >
            I'm Feeling Better
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const FearStrengthMap = ({ user, onBack }: { user: User, onBack: () => void }) => {
  const getStrengthLabel = (level: number) => {
    if (level < 20) return "Flickering Hope";
    if (level < 40) return "Rising Resilience";
    if (level < 60) return "Steady Ground";
    if (level < 80) return "Radiant Confidence";
    return "Unshakeable Light";
  };

  const getStrengthDescription = (level: number) => {
    if (level < 20) return "The path is still shrouded, but you've taken the first steps. Every whisper counts.";
    if (level < 40) return "You are beginning to find your voice. The shadows are receding as you practice.";
    if (level < 60) return "Your presence is felt. You are standing taller, and the world is becoming clearer.";
    if (level < 80) return "You are a beacon of courage. Your voice carries weight and your heart is open.";
    return "The fog has vanished. You are fully present, fully heard, and fully yourself.";
  };

  const chartData = user.courageHistory?.map(entry => ({
    time: new Date(entry.timestamp).toLocaleDateString(),
    level: entry.level
  })) || [];

  return (
    <div className="min-h-screen p-6 pt-24 max-w-6xl mx-auto pb-32">
      <header className="flex items-center justify-between mb-16">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-4xl font-light tracking-tighter">Courage Map</h2>
          <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-1">Visualizing Your Journey</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="relative h-[500px] glass-dark rounded-[4rem] overflow-hidden p-12 border border-white/5 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-vox-bg via-vox-bg to-vox-accent/5" />
            <div className="absolute inset-0 vox-gradient opacity-10" />
            
            <motion.div 
              initial={false}
              animate={{ 
                opacity: Math.max(0, 1 - (user.courageLevel / 100)),
                backdropFilter: `blur(${Math.max(0, 40 * (1 - user.courageLevel / 100))}px)`
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-vox-bg/60 pointer-events-none z-30"
            />

            <div className="relative z-10 grid grid-cols-10 grid-rows-10 h-full gap-2 md:gap-4">
              {[...Array(100)].map((_, i) => {
                const isActive = i < user.courageLevel;
                const delay = i * 0.005;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0.15,
                      scale: isActive ? 1 : 0.9,
                    }}
                    transition={{ delay, duration: 0.5 }}
                    className={`flex items-center justify-center rounded-lg ${isActive ? 'bg-vox-accent/5' : ''}`}
                  >
                    {isActive ? (
                      <Sun size={12} className="text-vox-accent" />
                    ) : (
                      <Cloud size={12} className="text-vox-paper/20" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xl font-light tracking-widest uppercase mb-8 text-vox-paper/40">Evolution of Courage</h3>
            <div className="h-[300px] w-full min-h-[300px] min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100} aspect={undefined}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.2)" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#050505', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="level" 
                    stroke="#0EA5E9" 
                    fillOpacity={1} 
                    fill="url(#colorLevel)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-vox-bg/40 backdrop-blur-md p-10 rounded-[3rem] border border-white/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl font-light tracking-tighter text-vox-accent">
                {user.courageLevel}<span className="text-2xl">%</span>
              </div>
              <div className="h-12 w-[1px] bg-white/10" />
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-vox-accent font-bold mb-1">Status</div>
                <div className="text-xl font-serif italic">{getStrengthLabel(user.courageLevel)}</div>
              </div>
            </div>
            <p className="text-vox-paper/60 text-sm leading-relaxed font-serif italic">
              "{getStrengthDescription(user.courageLevel)}"
            </p>
          </div>

          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-paper/40 mb-8">Goal Achievement</h3>
            <div className="space-y-6">
              {user.goals?.slice(0, 5).map(goal => (
                <div key={goal.id} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${goal.completed ? 'bg-vox-accent shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'bg-white/10'}`} />
                  <span className={`text-sm font-serif italic ${goal.completed ? 'text-vox-paper' : 'text-vox-paper/30'}`}>
                    {goal.text}
                  </span>
                </div>
              ))}
              {(!user.goals || user.goals.length === 0) && (
                <p className="text-xs text-vox-paper/20 italic">No goals set yet. Visit settings to define your path.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const VoiceCircles = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [activeCircle, setActiveCircle] = useState<any>(null);
  const [userStatus, setUserStatus] = useState({ isSpeaking: false, isTyping: false, isMuted: true });
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [alias, setAlias] = useState(`Seeker-${Math.floor(Math.random() * 1000)}`);
  const socketRef = useRef<WebSocket | null>(null);
  
  const [circles, setCircles] = useState([
    { id: "morning", name: "Gentle Morning", active: 12, type: "listening", color: "from-emerald-500/20 to-teal-500/20", description: "Soft music and shared silence to start your day." },
    { id: "courage", name: "Courage to Say No", active: 5, type: "sharing", color: "from-vox-accent/20 to-orange-500/20", description: "A space to practice boundaries and find your voice." },
    { id: "silent", name: "Silent Presence", active: 28, type: "presence", color: "from-blue-500/20 to-indigo-500/20", description: "No words needed. Just be here with others." },
    { id: "midnight", name: "Midnight Reflection", active: 8, type: "sharing", color: "from-purple-500/20 to-pink-500/20", description: "Late night thoughts and quiet support." },
  ]);

  const joinCircle = (circle: any) => {
    setActiveCircle(circle);
    // Circle join complete
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      active: 1,
      type: "sharing",
      color: "from-vox-accent/20 to-blue-500/20",
      description: newGroupDesc || "A new community space."
    };
    setCircles([newGroup, ...circles]);
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        groups: [...(prev.groups || []), newGroup.id]
      };
    });
    setNewGroupName("");
    setNewGroupDesc("");
    setShowCreateGroup(false);
  };

  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          userName: alias // Use alias for anonymity
        }));
      }
    };

    socket.onerror = (error) => {
      console.warn("WebSocket error (benign in dev):", error);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'room_update' && activeCircle && message.roomId === activeCircle.id) {
          setParticipants(message.participants);
        }
        if (message.type === 'chat_received' && activeCircle && message.roomId === activeCircle.id) {
          setMessages(prev => [...prev, { 
            id: Date.now() + Math.random(), 
            text: message.text, 
            sender: message.fromId === user.id ? "You" : message.fromName, 
            time: new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          }]);
        }
      } catch (e) {
        console.warn("Error parsing message:", e);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [user.id, alias, activeCircle?.id]);

  useEffect(() => {
    if (activeCircle && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'join_circle',
        roomId: activeCircle.id
      }));
    }
  }, [activeCircle]);

  useEffect(() => {
    if (activeCircle && socketRef.current?.readyState === WebSocket.OPEN) {
      const status = userStatus.isSpeaking ? 'speaking' : (userStatus.isTyping ? 'typing' : 'listening');
      socketRef.current.send(JSON.stringify({
        type: 'status_change',
        status
      }));
    }
  }, [userStatus, activeCircle]);

  const toggleMic = () => {
    setUserStatus(prev => ({ ...prev, isMuted: !prev.isMuted, isSpeaking: prev.isMuted ? true : false }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    socketRef.current.send(JSON.stringify({
      type: 'chat_message',
      text: chatMessage,
      alias: alias
    }));

    setChatMessage("");
    setUserStatus(prev => ({ ...prev, isTyping: false }));
  };

  const leaveCircle = () => {
    setActiveCircle(null);
    setMessages([]);
    setParticipants([]);
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-6xl mx-auto">
      <AnimatePresence mode="wait">
        {!activeCircle ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <header className="flex items-center justify-between mb-12">
              <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
                <ChevronRight className="rotate-180" size={20} /> Dashboard
              </button>
              <div className="flex items-center gap-6">
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(45, 212, 191, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateGroup(true)}
                  className="px-6 py-2 bg-vox-accent/10 border border-vox-accent/30 text-vox-accent rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Create Group
                </motion.button>
                <div className="text-right">
                  <h2 className="text-4xl font-light tracking-tighter">Voice Circles</h2>
                  <p className="text-vox-paper/40 text-sm font-serif italic">Anonymous shared presence</p>
                </div>
              </div>
            </header>

            {showCreateGroup && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-dark p-8 rounded-[2.5rem] border border-white/10 mb-12 max-w-2xl mx-auto"
              >
                <h3 className="text-2xl mb-6">Create a New Circle</h3>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Circle Name" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent"
                  />
                  <textarea 
                    placeholder="Description (What is this space for?)" 
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent h-24 resize-none"
                  />
                  <div className="flex gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={createGroup}
                      className="flex-1 py-4 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Establish Circle
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateGroup(false)}
                      className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-xs uppercase tracking-widest"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {circles.map(circle => (
                <motion.div 
                  key={circle.id}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => joinCircle(circle)}
                  className={`glass-dark p-8 rounded-[2.5rem] flex items-center justify-between group cursor-pointer border border-white/5 hover:border-vox-accent/30 transition-all relative overflow-hidden`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${circle.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${circle.type === 'presence' ? 'bg-blue-500/20' : 'bg-vox-accent/20'} border border-white/10`}>
                      {circle.type === 'presence' ? <Wind className="text-blue-400" /> : <Mic className="text-vox-accent" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-medium mb-1">{circle.name}</h3>
                      <div className="flex items-center gap-3 text-vox-paper/40 text-xs uppercase tracking-widest font-bold">
                        <span className="flex items-center gap-1.5"><Users size={12} className="text-vox-accent" /> {circle.active} present</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{circle.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-vox-accent group-hover:text-vox-bg transition-all">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 p-12 glass-dark rounded-[3rem] text-center border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-vox-accent/50 to-transparent" />
              <p className="text-2xl text-vox-paper/60 italic font-serif mb-8 leading-relaxed">
                "In the circle, your voice is a gift, and your silence is a sanctuary."
              </p>
              <div className="flex justify-center gap-8">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> Fully Anonymous
                </div>
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/30">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" /> End-to-End Encrypted
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[85vh]"
          >
            {/* Main Stage */}
            <div className="lg:col-span-3 flex flex-col glass-dark rounded-[3rem] border border-white/5 overflow-hidden relative">
              <div className="absolute inset-0 vox-gradient opacity-10 pointer-events-none" />
              
              <header className="p-8 flex items-center justify-between border-b border-white/5 relative z-10">
                <button onClick={leaveCircle} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper transition-colors">
                  <ChevronRight className="rotate-180" size={20} /> Leave Circle
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-light tracking-tight">{activeCircle.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-vox-paper/30">{activeCircle.type} session active</span>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-vox-bg bg-white/10 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-vox-bg bg-vox-accent flex items-center justify-center text-[10px] font-bold text-vox-bg">
                    +{activeCircle.active - 3}
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto p-12 relative z-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-12">
                  {/* Current User */}
                  <motion.div layout className="flex flex-col items-center gap-4">
                    <div className="relative">
                      {userStatus.isSpeaking && (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="absolute inset-0 rounded-full bg-vox-accent/40"
                        />
                      )}
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-2 transition-all duration-500 ${userStatus.isSpeaking ? 'border-vox-accent bg-vox-accent/20 shadow-[0_0_30px_rgba(45,212,191,0.2)]' : 'border-white/20 bg-white/5'}`}>
                        Y
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-vox-paper text-vox-bg text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tighter">
                        You
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-vox-paper/40">
                      {userStatus.isSpeaking ? 'Speaking' : userStatus.isTyping ? 'Typing...' : 'Listening'}
                    </span>
                  </motion.div>

                  <AnimatePresence>
                    {participants.filter(p => p.id !== user.id).map(p => (
                      <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                        className="flex flex-col items-center gap-4"
                      >
                        <div className="relative">
                          {p.status === 'speaking' && (
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1.6, opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 2 }}
                              className="absolute inset-0 rounded-full bg-vox-accent/30"
                            />
                          )}
                          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-2 transition-all duration-500 ${p.status === 'speaking' ? 'border-vox-accent bg-vox-accent/10' : 'border-white/10 bg-white/5'}`}>
                            {p.name[0]}
                          </div>
                          {p.status === 'speaking' && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-vox-accent text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                              Speaking
                            </div>
                          )}
                          {p.status === 'typing' && (
                            <div className="absolute -top-1 -right-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-lg flex gap-1 items-center border border-white/10">
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                              <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1 h-1 bg-vox-paper rounded-full" />
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-medium transition-colors duration-500 ${p.status === 'speaking' ? 'text-vox-accent' : 'text-vox-paper/50'}`}>{p.name}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <footer className="p-8 border-t border-white/5 flex items-center justify-center gap-6 relative z-10">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMic}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${userStatus.isMuted ? 'bg-white/5 text-vox-paper/40 border border-white/10' : 'bg-vox-accent text-vox-bg shadow-[0_0_30px_rgba(45,212,191,0.4)]'}`}
                >
                  {userStatus.isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full glass-dark flex items-center justify-center text-vox-paper/50 hover:text-vox-accent transition-all border border-white/5"
                >
                  <Wind size={24} />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-16 h-16 rounded-full glass-dark flex items-center justify-center text-vox-paper/50 hover:text-blue-400 transition-all border border-white/5"
                >
                  <Sparkles size={24} />
                </motion.button>
              </footer>
            </div>

            {/* Chat Panel */}
            <div className="flex flex-col glass-dark rounded-[3rem] border border-white/5 overflow-hidden">
              <header className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-vox-paper/40">Shared Echoes</h3>
                <span className="text-[10px] text-vox-accent font-bold">{messages.length} notes</span>
              </header>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <MessageSquare size={32} className="text-white/5 mb-4" />
                    <p className="text-xs text-vox-paper/20 italic font-serif">No echoes yet. Share a thought or a feeling.</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-vox-accent uppercase tracking-tighter">{msg.sender}</span>
                        <span className="text-[9px] text-vox-paper/20">{msg.time}</span>
                      </div>
                      <p className="text-sm text-vox-paper/80 leading-relaxed">{msg.text}</p>
                    </motion.div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text"
                    value={chatMessage}
                    onChange={(e) => {
                      setChatMessage(e.target.value);
                      setUserStatus(prev => ({ ...prev, isTyping: e.target.value.length > 0 }));
                    }}
                    onBlur={() => setUserStatus(prev => ({ ...prev, isTyping: false }))}
                    placeholder="Whisper a note..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-vox-accent/50 transition-all pr-12"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-vox-accent/20 text-vox-accent flex items-center justify-center hover:bg-vox-accent hover:text-vox-bg transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};



const EchoChamber = ({ onBack, user, safePlayPCM }: { onBack: () => void, user: User, safePlayPCM: (b: string, s?: number, o?: () => void) => Promise<any> }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const playNote = async (note: VoiceNote) => {
    if (!note.audioData) {
      alert("No audio data available for this note.");
      return;
    }
    
    // Echo complete
    
    if (playingId === note.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingId(note.id);

    try {
      if (note.type === 'companion') {
        // Play raw PCM audio using utility
        await safePlayPCM(note.audioData, 24000, () => setPlayingId(null));
      } else {
        // Play recorded audio using HTMLAudioElement
        const src = note.audioData.startsWith('data:') ? note.audioData : `data:audio/webm;base64,${note.audioData}`;
        audioRef.current = new Audio(src);
        audioRef.current.play();
        
        audioRef.current.onended = () => {
          setPlayingId(null);
        };
      }
    } catch (err) {
      console.error("Playback failed:", err);
      alert("Could not play this recording.");
      setPlayingId(null);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <div className="min-h-screen p-6 pt-24 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <h2 className="text-4xl font-light tracking-tighter">Echo Chamber</h2>
      </header>

      <div className="space-y-8">
        <div className="glass-dark p-12 rounded-[3rem] border border-white/5">
          <h3 className="text-2xl font-light tracking-tighter mb-10">Your Growth Proof</h3>
          
          <div className="space-y-4">
            {user.voiceNotes.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2rem]">
                <p className="text-vox-paper/30 font-serif italic">Your silence is waiting to be filled with strength.</p>
                <p className="text-[10px] uppercase tracking-widest text-vox-paper/20 mt-4">No recordings yet</p>
              </div>
            ) : (
              user.voiceNotes.map((note) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={note.id} 
                  className={`glass p-6 rounded-3xl border transition-all group ${playingId === note.id ? 'border-vox-accent bg-vox-accent/5 shadow-lg shadow-vox-accent/10' : 'border-white/5 hover:border-vox-accent/30'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                        note.type === 'breath' ? 'bg-blue-500/10 text-blue-400' :
                        note.type === 'whisper' ? 'bg-vox-accent/10 text-vox-accent' :
                        note.type === 'companion' ? 'bg-purple-500/10 text-purple-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {note.type === 'breath' ? <Wind size={28} /> : 
                         note.type === 'whisper' ? <Mic size={28} /> : 
                         note.type === 'companion' ? <Sparkles size={28} /> : 
                         <Activity size={28} />}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-vox-paper/40 mb-1 font-bold">{note.type}</div>
                        <div className="text-2xl font-light tracking-tighter">
                          {note.type === 'companion' ? 'Saved Insight' : new Date(note.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {note.audioData && (
                        <button 
                          onClick={() => playNote(note)}
                          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${playingId === note.id ? 'bg-vox-accent text-vox-bg scale-110' : 'bg-white/5 hover:bg-vox-accent hover:text-vox-bg group-hover:scale-110'}`}
                        >
                          {playingId === note.id ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {playingId === note.id && (
                    <div className="flex items-end gap-1 h-8 mb-4 px-2">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [4, Math.random() * 24 + 4, 4] }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5 }}
                          className="flex-1 bg-vox-accent rounded-full"
                        />
                      ))}
                    </div>
                  )}

                  <div className="pl-22">
                    {note.text && (
                      <p className="text-vox-paper/60 text-sm italic mb-3 leading-relaxed">"{note.text}"</p>
                    )}
                    <div className="text-xs text-vox-paper/30">
                      {note.type !== 'companion' && `${formatTime(note.duration)} duration • `}
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-10 rounded-[3rem] bg-vox-accent/5 border border-vox-accent/10 text-center">
          <p className="text-vox-paper/60 font-serif italic text-lg leading-relaxed">
            "Can you hear it? Your breath is deeper. Your words are clearer. You are stronger than you were."
          </p>
        </div>
      </div>
    </div>
  );
};

const ExitRitual = ({ user, onBack }: { user: User, onBack: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto pt-24 pb-48">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12"
      >
        <DoorOpen size={80} className="text-vox-accent mx-auto" />
      </motion.div>
      
      <h2 className="text-5xl mb-6 font-light tracking-tighter">The Beautiful Goodbye</h2>
      <p className="text-vox-paper/70 font-serif italic text-xl mb-12 leading-relaxed">
        VOXARA was built to be a bridge, not a destination. You've found your voice, and now it's time to use it in the real world.
      </p>

      <div className="glass-dark p-12 rounded-[3rem] mb-12 w-full border border-white/5">
        <h4 className="text-xs uppercase tracking-[0.3em] text-vox-paper/40 mb-8 font-bold">Your Journey Summary</h4>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="text-3xl font-light mb-2">{user.voiceNotes?.length || 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Whispers</div>
          </div>
          <div>
            <div className="text-3xl font-light mb-2">{user.courageLevel}%</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Courage</div>
          </div>
          <div>
            <div className="text-3xl font-light mb-2">{user.journalEntries?.length || 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-vox-paper/30 font-bold">Reflections</div>
          </div>
        </div>
      </div>

      <div className="space-y-6 w-full">
        <button 
          onClick={onBack}
          className="w-full py-6 bg-vox-accent text-vox-bg rounded-2xl font-bold uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-vox-accent/20"
        >
          Celebrate & Step Away
        </button>
        <button className="w-full py-6 bg-white/5 rounded-2xl font-bold uppercase tracking-widest text-xs text-vox-paper/40 hover:bg-white/10 transition-all" onClick={onBack}>
          I'm Not Quite Ready
        </button>
      </div>
    </div>
  );
};

const CourageConnections = ({ onBack, user }: { onBack: () => void, user: User }) => {
  const [partners, setPartners] = useState<any[]>([]);
  const [sentSignals, setSentSignals] = useState<string[]>([]);
  const [recentSignals, setRecentSignals] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'join',
          userId: user.id,
          userName: user.name
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'user_list') {
          // Filter out current user and map to partner format
          const otherUsers = message.users
            .filter((u: any) => u.id !== user.id)
            .map((u: any) => ({
              id: u.id,
              name: u.name,
              level: Math.floor(Math.random() * 40) + 30,
              journey: "Courage Seeker",
              status: "online",
              sharedWins: Math.floor(Math.random() * 10)
            }));
          
          // Add some mock offline partners if list is short
          if (otherUsers.length < 3) {
            const mocks = [
              { id: 'm1', name: "Elena", level: 72, journey: "Public Speaking", status: "offline", sharedWins: 12 },
              { id: 'm2', name: "Marcus", level: 45, journey: "Setting Boundaries", status: "offline", sharedWins: 8 },
            ];
            setPartners([...otherUsers, ...mocks]);
          } else {
            setPartners(otherUsers);
          }
        }
        if (message.type === 'signal_received') {
          // If it's for everyone or specifically for me
          if (!message.toId || message.toId === user.id) {
            setRecentSignals(prev => [{
              id: Date.now(),
              fromName: message.fromName,
              timestamp: message.timestamp
            }, ...prev].slice(0, 5));
          }
        }
      } catch (e) {
        console.warn("Socket message error:", e);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [user.id, user.name]);

  const sendSignal = (targetId: string) => {
    if (sentSignals.includes(targetId)) return;
    setSentSignals([...sentSignals, targetId]);
    
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'signal',
        fromId: user.id,
        fromName: user.name,
        toId: targetId
      }));
    }
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-16">
        <button onClick={onBack} className="flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
          <ChevronRight className="rotate-180" size={20} /> Dashboard
        </button>
        <div className="text-right">
          <h2 className="text-4xl font-light tracking-tighter">Courage Circles</h2>
          <p className="text-vox-paper/40 text-xs uppercase tracking-widest mt-1">Real-world connections</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-2xl font-light tracking-tighter mb-8">Partners in Courage</h3>
            <div className="space-y-4">
              {partners.map(p => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-vox-accent/30 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-2xl font-bold border border-white/10">
                        {p.name[0]}
                      </div>
                      {p.status === 'online' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-vox-bg" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xl font-medium">{p.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-vox-accent/10 text-vox-accent font-bold uppercase tracking-tighter">
                          Level {p.level}
                        </span>
                      </div>
                      <div className="text-sm text-vox-paper/40 italic font-serif">Journey: {p.journey}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-lg font-mono">{p.sharedWins}</div>
                      <div className="text-[8px] uppercase tracking-widest text-vox-paper/30">Shared Wins</div>
                    </div>
                    <button 
                      onClick={() => sendSignal(p.id)}
                      disabled={sentSignals.includes(p.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${sentSignals.includes(p.id) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-vox-accent/10 text-vox-accent hover:bg-vox-accent hover:text-vox-bg'}`}
                    >
                      {sentSignals.includes(p.id) ? <Zap size={20} /> : <Handshake size={20} />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-dark p-8 rounded-[3rem] border border-white/5 bg-vox-accent/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-vox-accent mb-6">Shared Momentum</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-vox-paper/60">Community Strength</span>
                <span className="text-lg font-mono">84%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '84%' }}
                  className="h-full bg-vox-accent"
                />
              </div>
              <p className="text-xs text-vox-paper/40 leading-relaxed italic font-serif">
                "You are not walking this path alone. 1,242 souls are building their courage alongside you today."
              </p>
            </div>
          </div>

          <div className="glass-dark p-8 rounded-[3rem] border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-vox-paper/30 mb-6">Recent Signals</h4>
            <div className="space-y-4">
              {recentSignals.length === 0 ? (
                <p className="text-xs text-vox-paper/20 italic">Waiting for signals of strength...</p>
              ) : (
                recentSignals.map(signal => (
                  <motion.div 
                    key={signal.id} 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Zap size={14} />
                    </div>
                    <p className="text-vox-paper/60">
                      <span className="text-vox-paper font-bold">{signal.fromName}</span> sent you a Strength Signal.
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const SettingsView = ({ onBack, user, setUser }: { onBack: () => void, user: User, setUser: React.Dispatch<React.SetStateAction<User | null>> }) => {
  const [safeWord, setSafeWord] = useState(user.safeWord);
  const [goals, setGoals] = useState<UserGoal[]>(user.goals || []);
  const [newGoal, setNewGoal] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setUser(prev => prev ? ({ ...prev, safeWord, goals }) : null);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const goal: UserGoal = {
      id: Math.random().toString(36).substr(2, 9),
      text: newGoal,
      completed: false,
      category: 'courage'
    };
    setGoals([...goals, goal]);
    setNewGoal('');
  };

  const toggleGoal = (id: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 relative overflow-y-auto pt-24 pb-32">
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark p-12 rounded-[4rem] w-full max-w-3xl border border-white/5 relative z-10"
      >
        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 rounded-2xl bg-vox-accent/20 flex items-center justify-center border border-vox-accent/30">
            <Settings size={32} className="text-vox-accent" />
          </div>
          <div>
            <h2 className="text-5xl font-light tracking-tighter">Sanctuary Settings</h2>
            <p className="text-vox-paper/40 font-serif italic">Configure your safe space & journey</p>
          </div>
        </div>

        <div className="space-y-16">
          {/* Goals Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Courage Goals</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-vox-accent transition-colors"
                  placeholder="Add a new goal..."
                />
                <motion.button 
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(45, 212, 191, 0.9)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addGoal}
                  className="px-6 bg-vox-accent text-vox-bg rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Add
                </motion.button>
              </div>
              <div className="space-y-2">
                {goals.map(goal => (
                  <motion.div 
                    key={goal.id} 
                    whileHover={{ x: 4, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group"
                  >
                    <div className="flex items-center gap-4">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleGoal(goal.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${goal.completed ? 'bg-vox-accent border-vox-accent text-vox-bg' : 'border-white/20'}`}
                      >
                        {goal.completed && <CheckCircle2 size={14} />}
                      </motion.button>
                      <span className={`text-sm ${goal.completed ? 'text-vox-paper/30 line-through' : 'text-vox-paper'}`}>{goal.text}</span>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.2, color: "rgb(248, 113, 113)" }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeGoal(goal.id)}
                      className="text-vox-paper/20 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Emergency Protocol */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Shield size={16} className="text-vox-accent" />
              <h3 className="text-xs uppercase tracking-[0.3em] font-bold text-vox-accent">Emergency Protocol</h3>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] uppercase tracking-widest text-vox-paper/40 mb-2">Safe Word</label>
                <input 
                  type="text" 
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-vox-accent transition-colors"
                  placeholder="Enter your safe word..."
                />
                <p className="text-xs text-vox-paper/30 leading-relaxed italic font-serif">
                  Speaking this word during any practice will immediately trigger the emergency grounding sequence.
                </p>
              </div>
            </div>
          </section>

          <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: isSaved ? "rgb(16, 185, 129)" : "rgba(45, 212, 191, 0.9)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className={`w-full py-6 rounded-2xl font-bold text-xs uppercase tracking-[0.4em] transition-all shadow-xl ${isSaved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-vox-accent text-vox-bg shadow-vox-accent/20'}`}
          >
            {isSaved ? 'Sanctuary Updated' : 'Save Changes'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const Meditations = ({ onBack, safePlayPCM }: { onBack: () => void, safePlayPCM: any }) => {
  const [activeMeditation, setActiveMeditation] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const meditationList = [
    { 
      id: 'courage-1', 
      title: 'The Inner Lion', 
      theme: 'Courage', 
      duration: '5 min', 
      desc: 'A powerful visualization to awaken your latent strength and confidence.',
      script: 'Find a comfortable position. Close your eyes. Imagine a golden light at your center. This is your courage. With every breath, it grows stronger. You are a lion, calm and powerful. You face the world with a steady heart.'
    },
    { 
      id: 'calm-1', 
      title: 'Ocean Breath', 
      theme: 'Calm', 
      duration: '10 min', 
      desc: 'Synchronize your breath with the rhythm of the tides to release anxiety.',
      script: 'Breathe in deeply, like a rising wave. Hold for a moment at the peak. Now exhale slowly, like the tide receding. Feel the tension leaving your body with the water. You are the ocean, vast and peaceful.'
    },
    { 
      id: 'wellbeing-1', 
      title: 'Sanctuary of Self', 
      theme: 'Well-being', 
      duration: '7 min', 
      desc: 'Build a mental sanctuary where you are always safe and cherished.',
      script: 'Imagine a beautiful garden. This is your sanctuary. The air is warm and filled with the scent of pine. Here, you are safe. Here, you are enough. Take a moment to simply be in this space of pure well-being.'
    },
    {
      id: 'courage-2',
      title: 'The Mountain Stand',
      theme: 'Resilience',
      duration: '8 min',
      desc: 'Stand firm against the winds of change and uncertainty.',
      script: 'Visualize yourself as a great mountain. Clouds may pass, storms may rage, but you remain unmoved. Your roots go deep into the earth. You are solid. You are enduring. You are resilient.'
    }
  ];

  const startMeditation = async (meditation: any) => {
    setActiveMeditation(meditation);
    setIsLoading(true);
    setIsPlaying(true);
    
    try {
      const audioBase64 = await generateSpeech(meditation.script);
      if (audioBase64) {
        await safePlayPCM(audioBase64, 24000, () => {
          setIsPlaying(false);
          setActiveMeditation(null);
        });
      }
    } catch (err) {
      console.error("Meditation audio error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopMeditation = () => {
    setIsPlaying(false);
    setActiveMeditation(null);
    // safePlayPCM already handles stopping previous audio
  };

  return (
    <div className="min-h-screen p-6 pt-24 max-w-5xl mx-auto">
      <FloatingParticles />
      <div className="absolute inset-0 vox-gradient opacity-30 fixed" />
      <button onClick={onBack} className="absolute top-10 left-10 z-20 flex items-center gap-2 text-vox-paper/50 hover:text-vox-paper">
        <ChevronRight className="rotate-180" size={20} /> Dashboard
      </button>

      <div className="text-center mb-16 relative z-10">
        <div className="w-24 h-24 rounded-[2.5rem] bg-vox-accent/10 flex items-center justify-center mx-auto mb-8 border border-vox-accent/20">
          <Wind size={40} className="text-vox-accent" />
        </div>
        <h2 className="text-6xl font-light tracking-tighter mb-4">Guided Meditations</h2>
        <p className="text-vox-paper/40 font-serif italic text-xl">"In the stillness, we find the courage to be."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {meditationList.map(m => (
          <motion.div 
            key={m.id} 
            whileHover={{ scale: 1.02, y: -5, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            className="glass-dark rounded-[3rem] p-10 border border-white/5 flex flex-col justify-between group hover:border-vox-accent/30 transition-all"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="text-[10px] uppercase tracking-widest font-bold text-vox-accent px-3 py-1 bg-vox-accent/10 rounded-full">
                  {m.theme}
                </div>
                <div className="text-vox-paper/30 text-xs font-mono">{m.duration}</div>
              </div>
              <h3 className="text-3xl font-serif italic mb-4 group-hover:text-vox-accent transition-colors">{m.title}</h3>
              <p className="text-vox-paper/50 text-sm leading-relaxed mb-8">{m.desc}</p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: activeMeditation?.id === m.id ? "rgb(220, 38, 38)" : "rgba(45, 212, 191, 0.9)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => activeMeditation?.id === m.id ? stopMeditation() : startMeditation(m)}
              disabled={isLoading}
              className={`w-full py-5 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeMeditation?.id === m.id ? 'bg-red-500 text-white' : 'bg-vox-accent text-vox-bg shadow-lg shadow-vox-accent/20'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading && activeMeditation?.id === m.id ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-vox-bg/30 border-t-vox-bg rounded-full"
                />
              ) : activeMeditation?.id === m.id ? (
                <><Square size={16} fill="currentColor" /> Stop Meditation</>
              ) : (
                <><Play size={16} fill="currentColor" className="ml-1" /> Begin Session</>
              )}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {activeMeditation && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 glass-dark px-12 py-6 rounded-full border border-vox-accent/30 flex items-center gap-8 z-50 shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-vox-accent/20 flex items-center justify-center">
              <Wind size={20} className="text-vox-accent animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-vox-paper/40 font-bold">Now Playing</div>
              <div className="text-sm font-medium">{activeMeditation.title}</div>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <button onClick={stopMeditation} className="text-vox-paper/50 hover:text-red-400 transition-colors">
            <X size={24} />
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppState>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const currentAudioRef = useRef<{ stop: () => void } | null>(null);
  const lastNotifiedLevelRef = useRef<number | null>(null);

  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Daily data update and exit logic
  useEffect(() => {
    if (!user) return;

    const lastEntry = user.courageHistory?.[user.courageHistory.length - 1];
    const today = new Date().setHours(0, 0, 0, 0);
    const lastEntryDate = lastEntry ? new Date(lastEntry.timestamp).setHours(0, 0, 0, 0) : 0;

    if (today > lastEntryDate) {
      // New day, add a new entry to courageHistory
      const newEntry = {
        timestamp: Date.now(),
        level: user.courageLevel,
        rejection: lastEntry?.rejection || 0,
        conflict: lastEntry?.conflict || 0,
        misunderstanding: lastEntry?.misunderstanding || 0,
        vulnerability: lastEntry?.vulnerability || 0,
      };
      
      const updatedUser = {
        ...user,
        courageHistory: [...(user.courageHistory || []), newEntry]
      };
      
      setUser(updatedUser);
      saveUserData(user.id, updatedUser);
    }

    // Exit logic
    if (user.courageLevel >= 100 && !showExitPrompt && view !== 'exit') {
      setShowExitPrompt(true);
    }
  }, [user?.id, user?.courageLevel, view]);

  const stopAllAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.stop();
      currentAudioRef.current = null;
    }
  };

  const safePlayPCM = async (base64Audio: string, sampleRate: number = 24000, onEnded?: () => void, volume: number = 1.0) => {
    stopAllAudio();
    const audio = await playPCM(base64Audio, sampleRate, onEnded, volume);
    if (audio) {
      currentAudioRef.current = audio;
    }
    return audio;
  };

  // Global audio cleanup on view change
  useEffect(() => {
    stopAllAudio();
  }, [view]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // Try to fetch full data from Firestore first
        const storedData = await getUserData(firebaseUser.uid);
        
        let currentUserData = storedData;
        
        if (storedData) {
          setUser(storedData);
        } else {
          // If no data exists, create the initial basic data
          const basicUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Seeker',
            email: firebaseUser.email || '',
            courageLevel: 30,
            safeWord: 'Blue Spruce',
            voiceNotes: [],
            journalEntries: [],
            goals: [],
            emergencyContacts: [],
            groups: [],
            courageHistory: [
              { timestamp: Date.now() - 86400000 * 4, level: 10, rejection: 20, conflict: 10, misunderstanding: 30, vulnerability: 5 },
              { timestamp: Date.now() - 86400000 * 3, level: 12, rejection: 25, conflict: 15, misunderstanding: 25, vulnerability: 10 },
              { timestamp: Date.now() - 86400000 * 2, level: 15, rejection: 22, conflict: 12, misunderstanding: 28, vulnerability: 15 },
              { timestamp: Date.now() - 86400000 * 1, level: 18, rejection: 30, conflict: 20, misunderstanding: 20, vulnerability: 25 },
              { timestamp: Date.now(), level: 20, rejection: 35, conflict: 25, misunderstanding: 15, vulnerability: 30 }
            ],
            hasCompletedSafetyOnboarding: false,
            dailyRituals: [
              { id: 'r1', text: "It's okay to feel exactly as I do right now.", completed: false },
              { id: 'r2', text: "I am strong enough to carry this moment.", completed: false },
              { id: 'r3', text: "My voice has value, even when it shakes.", completed: false },
              { id: 'r4', text: "I am building courage, one breath at a time.", completed: false },
              { id: 'r5', text: "I am enough, exactly as I am.", completed: false }
            ],
            moodHistory: []
          };
          setUser(basicUser);
          await saveUserData(firebaseUser.uid, basicUser);
          currentUserData = basicUser;
        }

        if (view === 'auth') {
          if (!currentUserData?.hasCompletedSafetyOnboarding) {
            setView('safety-onboarding');
          } else {
            setView('home');
          }
        }
      } else {
        setUser(null);
        if (view !== 'landing' && view !== 'auth') {
          setView('auth');
        }
      }
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [view]);

  // Auto-save user data whenever it changes
  useEffect(() => {
    if (user && user.id && !isUserLoading) {
      saveUserData(user.id, user);
      
      // Auto-exit if confidence reaches 100
      if (user.courageLevel >= 100 && view !== 'exit' && view !== 'anchor') {
        setView('exit');
      }

      // Discreet emergency notification if level is critical
      // Only log if the level has changed or we haven't notified yet for this level
      if (user.courageLevel <= 20 && user.emergencyContacts && user.emergencyContacts.length > 0) {
        if (lastNotifiedLevelRef.current !== user.courageLevel) {
          // In a real app, this would trigger a server-side notification
          console.log("CRITICAL LEVEL REACHED: Notifying emergency contacts...", {
            contacts: user.emergencyContacts,
            currentLevel: user.courageLevel
          });
          lastNotifiedLevelRef.current = user.courageLevel;
        }
      } else if (user.courageLevel > 20) {
        // Reset notification ref when level recovers
        lastNotifiedLevelRef.current = null;
      }
    }
  }, [user, view, isUserLoading]);

  const pageTransition: any = {
    duration: 0.4,
    ease: "easeOut"
  };

  return (
    <div className="min-h-screen bg-vox-bg text-vox-paper">
      {/* Global Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vox-accent/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <LandingPage onStart={() => setView(user ? 'home' : 'auth')} isLoggedIn={!!user} />
          </motion.div>
        )}

        {view === 'auth' && (
          <motion.div 
            key="auth" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <AuthPage />
          </motion.div>
        )}

        {view === 'safety-onboarding' && user && (
          <motion.div 
            key="safety-onboarding" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SafetyOnboarding user={user} setUser={setUser} onComplete={() => setView('home')} />
          </motion.div>
        )}

        {view === 'home' && user && (
          <motion.div 
            key="home" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Home user={user} setView={setView} />
          </motion.div>
        )}

        {view === 'dashboard' && user && (
          <motion.div 
            key="dashboard" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Dashboard user={user} setView={setView} setUser={setUser} />
          </motion.div>
        )}

        {view === 'whisper' && user && (
          <motion.div 
            key="whisper" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            transition={pageTransition}
          >
            <WhisperMode onBack={() => { stopAllAudio(); setView('home'); }} user={user} setUser={setUser} safePlayPCM={safePlayPCM} stopAllAudio={stopAllAudio} setView={setView} />
          </motion.div>
        )}

        {view === 'echo' && user && (
          <motion.div 
            key="echo" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={pageTransition}
          >
            <EchoChamber onBack={() => { stopAllAudio(); setView('home'); }} user={user} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}

        {view === 'companion' && user && (
          <motion.div 
            key="companion" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={pageTransition}
          >
            <CompanionMode onBack={() => { stopAllAudio(); setView('home'); }} user={user} setUser={setUser} safePlayPCM={safePlayPCM} stopAllAudio={stopAllAudio} setView={setView} />
          </motion.div>
        )}

        {view === 'presence' && (
          <motion.div 
            key="presence" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <PresenceMode onBack={() => { stopAllAudio(); setView('home'); }} />
          </motion.div>
        )}

        {view === 'simulation' && user && (
          <motion.div 
            key="simulation" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <BelovedBridge 
              onBack={() => { stopAllAudio(); setView('home'); }} 
              onExitToEmergency={() => setView('bridge-complete')} 
              safePlayPCM={safePlayPCM} 
              stopAllAudio={stopAllAudio} 
            />
          </motion.div>
        )}

        {view === 'bridge-complete' && user && (
          <motion.div 
            key="bridge-complete" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <BridgeCompletionScreen 
              onBack={() => setView('home')} 
              onReturn={() => setView('simulation')} 
            />
          </motion.div>
        )}

        {view === 'journal' && user && (
          <motion.div 
            key="journal" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Journal onBack={() => setView('home')} user={user} setUser={setUser} setView={setView} />
          </motion.div>
        )}

        {view === 'rituals' && user && (
          <motion.div 
            key="rituals" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <DailyRituals user={user} setUser={setUser} onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'calm' && (
          <motion.div 
            key="calm" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <CalmCenter onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'meditations' && (
          <motion.div 
            key="meditations" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <Meditations onBack={() => setView('dashboard')} safePlayPCM={safePlayPCM} />
          </motion.div>
        )}


        {view === 'map' && user && (
          <motion.div 
            key="map" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <FearStrengthMap user={user} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'circles' && user && (
          <motion.div 
            key="circles" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <VoiceCircles user={user} setUser={setUser} onBack={() => setView('dashboard')} />
          </motion.div>
        )}

        {view === 'connections' && user && (
          <motion.div 
            key="connections" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <CourageConnections user={user} onBack={() => setView('dashboard')} />
          </motion.div>
        )}



        {view === 'exit' && user && (
          <motion.div 
            key="exit" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <ExitRitual user={user} onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'anchor' && user && (
          <motion.div 
            key="anchor" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <AnchorMode onBack={() => setView('dashboard')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'settings' && user && (
          <motion.div 
            key="settings" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SettingsView onBack={() => setView('home')} user={user} setUser={setUser} />
          </motion.div>
        )}

        {view === 'notifications' && user && (
          <motion.div 
            key="notifications" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
            className="min-h-screen p-12 pt-32 max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-light tracking-tighter mb-8">Notifications</h2>
            <div className="glass-dark p-8 rounded-3xl border border-white/10 text-center">
              <p className="text-vox-paper/40 italic">No new notifications in your sanctuary.</p>
              <button onClick={() => setView('home')} className="mt-8 text-vox-accent uppercase tracking-widest text-xs font-bold">Back to Home</button>
            </div>
          </motion.div>
        )}

        {view === 'energy' && user && (
          <motion.div 
            key="energy" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SocialEnergyMeter user={user} setUser={setUser} onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'avoidance' && user && (
          <motion.div 
            key="avoidance" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <AvoidanceLoopBreaker user={user} setUser={setUser} onBack={() => setView('home')} />
          </motion.div>
        )}

        {view === 'future-self' && user && (
          <motion.div 
            key="future-self" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <FutureSelfDialogue user={user} setUser={setUser} onBack={() => setView('home')} setView={setView} />
          </motion.div>
        )}

        {view === 'help' && (
          <motion.div 
            key="help" 
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={pageTransition}
          >
            <SanctuaryGuide onBack={() => setView('home')} />
          </motion.div>
        )}
      </AnimatePresence>

      {showExitPrompt && (
        <ExitPrompt 
          onConfirm={() => {
            setShowExitPrompt(false);
            setView('exit');
          }}
          onCancel={() => setShowExitPrompt(false)}
        />
      )}

      {/* Global Navigation (Only when logged in) */}
      {user && view !== 'landing' && view !== 'auth' && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 glass px-6 py-2 rounded-full flex gap-2 z-50 shadow-2xl border border-white/10">
          {[
            { id: 'home', icon: HomeIcon, label: 'Home' },
            { id: 'dashboard', icon: BarChart2, label: 'Progress' },
            { id: 'companion', icon: Sparkles, label: 'AI Companion' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item, idx, arr) => (
            <motion.button 
              key={item.id}
              whileTap={{ scale: 0.8 }}
              onClick={() => setView(item.id as AppState)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative group ${view === item.id ? 'bg-vox-accent text-white' : 'text-vox-paper/50'}`}
              title={item.label}
            >
              <item.icon size={20} />
              <span className={`absolute -top-10 px-2 py-1 bg-vox-bg border border-white/10 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[60]
                ${idx === 0 ? 'left-4' : idx === arr.length - 1 ? 'right-4' : 'left-1/2 -translate-x-1/2'}
              `}>
                {item.label}
              </span>
            </motion.button>
          ))}
          <div className="w-px h-8 bg-white/10 self-center mx-1" />
          <button 
            onClick={() => setView('exit')}
            className="w-12 h-12 rounded-full flex items-center justify-center text-vox-paper/50 hover:bg-white/5 group relative"
            title="Exit"
          >
            <LogOut size={20} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-vox-bg border border-white/10 rounded text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Exit
            </span>
          </button>
        </nav>
      )}
    </div>
  );
}
