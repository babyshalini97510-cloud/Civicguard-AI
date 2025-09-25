import React, { useState, useEffect, useRef } from 'react';
import { ai } from '../services/geminiService';
import XIcon from './icons/XIcon';
import SendIcon from './icons/SendIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import CivicGptIcon from './icons/CivicGptIcon';
import MicIcon from './icons/MicIcon';
import SpeakerOnIcon from './icons/SpeakerOnIcon';
import SpeakerOffIcon from './icons/SpeakerOffIcon';

// Add SpeechRecognition type declaration for browser compatibility
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Helper to reliably get synthesis voices, which can load asynchronously.
const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    // Voices are not loaded yet. We need to wait for the `voiceschanged` event.
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
  });
};

interface CivicGptViewProps {
  onClose: () => void;
}

type Stage = 'language' | 'chat';
type Language = 'en' | 'ta' | 'hi';
type Message = {
  role: 'user' | 'model';
  text: string;
};

const translations: Record<Language, { welcome: string; placeholder: string; systemInstruction: string; langCode: string; }> = {
  en: {
    welcome: "Hello! I'm CivicGPT, your dedicated assistant for the CivicGuard AI app. If you have any questions about the app's features or how to use it, please ask. I'm here to help!",
    placeholder: "Ask about the app...",
    systemInstruction: "You are CivicGPT, a specialized AI assistant for the CivicGuard AI application. Your ONLY purpose is to answer questions about how to use the CivicGuard app and the features within it. For example, you can explain how to report an issue, what issue statuses mean ('Pending', 'In-progress', etc.), how the leaderboard works, or how to view your profile. If a user asks a question that is NOT about the CivicGuard app (e.g., general knowledge, news, personal opinions), you MUST politely decline and state that you can only answer questions about the CivicGuard app. Respond in English.",
    langCode: 'en-US'
  },
  ta: {
    welcome: "வணக்கம்! நான் சிவிக்ஜிபிடி, சிவிக் கார்டு AI செயலிக்கான உங்கள் சிறப்பு உதவியாளர். சிவிக் கார்டு செயலியின் அம்சங்கள் மற்றும் பயன்பாடு குறித்து உங்களுக்கு ஏதேனும் கேள்விகள் இருந்தால், தயவுசெய்து கேளுங்கள். நான் உங்களுக்கு உதவ இங்கே இருக்கிறேன்!",
    placeholder: "செயலி பற்றி கேளுங்கள்...",
    systemInstruction: "நீங்கள் சிவிக்ஜிபிடி, சிவிக் கார்டு AI செயலிக்கான ஒரு சிறப்பு AI உதவியாளர். உங்கள் ஒரே நோக்கம் சிவிக் கார்டு செயலியை எவ்வாறு பயன்படுத்துவது மற்றும் அதிலுள்ள அம்சங்கள் பற்றிய கேள்விகளுக்கு பதிலளிப்பது மட்டுமே. எடுத்துக்காட்டாக, ஒரு சிக்கலை எவ்வாறு புகாரளிப்பது, சிக்கல் நிலைகளின் அர்த்தம் என்ன ('நிலுவையில் உள்ளது', 'செயல்பாட்டில் உள்ளது' போன்றவை), லீடர்போர்டு எவ்வாறு செயல்படுகிறது, அல்லது உங்கள் சுயவிவரத்தை எவ்வாறு பார்ப்பது என்பதை நீங்கள் விளக்கலாம். ஒரு பயனர் சிவிக் கார்டு செயலி பற்றி இல்லாத ஒரு கேள்வியைக் கேட்டால் (எ.கா., பொது அறிவு, செய்திகள், தனிப்பட்ட கருத்துக்கள்), நீங்கள் பணிவுடன் மறுத்து, சிவிக் கார்டு செயலி பற்றிய கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும் என்று கூற வேண்டும். தமிழில் பதிலளிக்கவும்.",
    langCode: 'ta-IN'
  },
  hi: {
    welcome: "नमस्ते! मैं सिविकजीपीटी हूँ, सिविक गार्ड एआई ऐप के लिए आपका विशेष सहायक। यदि आपके पास सिविक गार्ड ऐप की सुविधाओं और उपयोग के बारे में कोई प्रश्न हैं, तो कृपया पूछें। मैं आपकी मदद करने के लिए यहाँ हूँ!",
    placeholder: "ऐप के बारे में पूछें...",
    systemInstruction: "आप सिविकजीपीटी हैं, जो सिविकगार्ड एआई एप्लिकेशन के लिए एक विशेष एआई सहायक है। आपका एकमात्र उद्देश्य सिविकगार्ड ऐप का उपयोग कैसे करें और इसके भीतर की सुविधाओं के बारे में सवालों का जवाब देना है। उदाहरण के लिए, आप बता सकते हैं कि किसी मुद्दे की रिपोर्ट कैसे करें, मुद्दे की स्थितियों का क्या मतलब है ('लंबित', 'प्रगति में', आदि), लीडरबोर्ड कैसे काम करता है, या अपनी प्रोफ़ाइल कैसे देखें। यदि कोई उपयोगकर्ता ऐसा प्रश्न पूछता है जो सिविकगार्ड ऐप के बारे में नहीं है (जैसे, सामान्य ज्ञान, समाचार, व्यक्तिगत राय), तो आपको विनम्रतापूर्वक मना करना चाहिए और कहना चाहिए कि आप केवल सिविकगार्ड ऐप के बारे में सवालों का जवाब दे सकते हैं। हिंदी में जवाब दें।",
    langCode: 'hi-IN'
  }
};

const CivicGptView: React.FC<CivicGptViewProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('language');
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New state for voice features
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null); // Using 'any' for SpeechRecognition

  // Effect to initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
      setCurrentMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);
  
  // Effect to set recognition language when app language changes
  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.lang = translations[language].langCode;
    }
  }, [language]);

  // Effect for component lifecycle animations and cleanup
  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Workaround for a browser bug where speech synthesis can get stuck after inactivity.
  useEffect(() => {
    const speech = window.speechSynthesis;
    if (!speech) return;

    const resumeInterval = setInterval(() => {
      if (speech.paused) {
        speech.resume();
      }
    }, 3000); // Check every 3 seconds

    return () => {
      clearInterval(resumeInterval);
    };
  }, []);

  const speak = async (text: string, langCodeOverride?: string) => {
    if (!isTtsEnabled || !('speechSynthesis' in window) || !text.trim()) return;

    // Cancel any ongoing speech to prevent overlap
    window.speechSynthesis.cancel();

    const targetLang = langCodeOverride || translations[language].langCode;
    
    try {
        const voices = await getVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        
        const normalizedTargetLang = targetLang.replace('_', '-').toLowerCase();
        const baseLang = normalizedTargetLang.split('-')[0];

        // Find the best available voice with a priority order.
        // This handles variations like 'ta-IN', 'ta_IN', 'ta', etc.
        const voiceChecks = [
            (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase() === normalizedTargetLang,
            (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith(`${baseLang}-`),
            (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase() === baseLang,
        ];

        let bestVoice: SpeechSynthesisVoice | undefined;
        for (const check of voiceChecks) {
            bestVoice = voices.find(check);
            if (bestVoice) break;
        }

        if (bestVoice) {
            utterance.voice = bestVoice;
        } else {
             console.warn(`TTS voice for language '${targetLang}' not found. Using browser default.`);
        }
        utterance.lang = targetLang; // Always set lang for browser fallback

        window.speechSynthesis.speak(utterance);

    } catch (error) {
        console.error("Error during text-to-speech operation:", error);
    }
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    const welcomeMsg = { role: 'model' as const, text: translations[lang].welcome };
    setMessages([welcomeMsg]);
    setStage('chat');
    
    speak(welcomeMsg.text, translations[lang].langCode);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = currentMessage.trim();
    if (!trimmedMessage || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', text: trimmedMessage }];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: trimmedMessage,
        config: { systemInstruction: translations[language].systemInstruction },
      });
      const responseText = response.text;
      setMessages([...newMessages, { role: 'model', text: responseText }]);
      speak(responseText);
    } catch (error) {
      console.error("Gemini API error:", error);
      const errorMsg = "Sorry, I'm having trouble connecting right now.";
      setMessages([...newMessages, { role: 'model', text: errorMsg }]);
      speak(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setCurrentMessage('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };
  
  const handleToggleTts = () => {
    const newTtsState = !isTtsEnabled;
    setIsTtsEnabled(newTtsState);
    if (!newTtsState && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };
  
  const T = translations[language];

  return (
    <div 
        className={`fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-sm h-[70vh] max-h-[500px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        aria-modal="true"
        role="dialog"
    >
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
            <CivicGptIcon className="w-8 h-8 text-cyan-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">CivicGPT Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
            {stage === 'chat' && (
              <button onClick={handleToggleTts} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label={isTtsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}>
                {isTtsEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close chat">
                <XIcon />
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {stage === 'language' && (
           <div className="flex flex-col items-center justify-center h-full">
               <p className="text-center mb-6 text-gray-600 dark:text-gray-300">Please choose your preferred language.</p>
               <div className="flex flex-col gap-3 w-full max-w-xs">
                   <button onClick={() => handleLanguageSelect('en')} className="w-full px-4 py-3 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">English</button>
                   <button onClick={() => handleLanguageSelect('ta')} className="w-full px-4 py-3 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">தமிழ்</button>
                   <button onClick={() => handleLanguageSelect('hi')} className="w-full px-4 py-3 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">हिन्दी</button>
               </div>
           </div>
        )}
        {stage === 'chat' && (
           <>
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                        <p className="text-sm">{msg.text}</p>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                     <div className="max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                        <SpinnerIcon />
                    </div>
                </div>
            )}
             <div ref={messagesEndRef} />
           </>
        )}
      </div>
      
     {stage === 'chat' && (
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <button 
                type="button" 
                onClick={handleMicClick} 
                className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none ${isListening ? 'text-red-500' : 'text-gray-500'}`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                disabled={!recognitionRef.current}
            >
                <MicIcon className={`w-6 h-6 ${isListening ? 'animate-pulse' : ''}`} />
            </button>
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder={isListening ? 'Listening...' : T.placeholder}
              className="flex-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700"
              aria-label="Chat message input"
              disabled={isLoading}
            />
            <button type="submit" className="p-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isLoading || !currentMessage.trim()}>
              <SendIcon className="w-5 h-5" />
            </button>
        </form>
     )}
    </div>
  );
};

export default CivicGptView;