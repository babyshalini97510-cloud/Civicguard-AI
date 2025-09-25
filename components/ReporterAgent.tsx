
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import ReportSummary from './ReportSummary';
import SpinnerIcon from './icons/SpinnerIcon';
import { ai, analyzeImageAuthenticity } from '../services/geminiService';
import { Type } from "@google/genai";
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import { getDistrictNames, getDistrictData, District } from '../data/locationService';
import CameraCapture from './CameraCapture';
import EmotionRecorder from './EmotionRecorder';
import VideoRecorder from './VideoRecorder';

import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import RobotIcon from './icons/RobotIcon';
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
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
  });
};


interface ReporterAgentProps {
  onBack: () => void;
  onSubmit: (report: any) => void;
  user: User;
}

type ConversationStage = 
  'language' | 'district' | 'panchayat' | 'village' | 'street' | 'landmark' | 
  'title' | 'category' | 'urgency' | 'description' | 
  'evidence' | 'processing' | 'summary' | 'completed';

type Language = 'en' | 'ta' | 'hi';

type AnalysisStatus = {
    status: 'Authentic' | 'Manipulated' | 'AI-Generated';
    confidence: number;
    reasoning: string;
};

interface Evidence {
    photo: string;
    gps: { lat: number; lng: number; accuracy: number } | null;
    timestamp: string;
    analysis?: AnalysisStatus | 'pending';
}

const translations: Record<Language, Record<string, string> & { langCode: string }> = {
  en: {
    welcome: "Hello. I am Arya, an AI social service investigator with CivicGuard. I'm here to help document the issue you are reporting. To start, please choose your preferred language below.",
    district_prompt: "Which district are you reporting from?",
    panchayat_prompt: "Please tell me your Panchayat name.",
    village_prompt: "Which village is this issue located in?",
    street_prompt: "Enter the street or locality.",
    landmark_prompt: "Do you want to add a nearby landmark? (Optional)",
    title_prompt: "Give a short title for the issue.",
    category_prompt: "Select the issue category. Example: Roads, Water, Electricity.",
    urgency_prompt: "How urgent is this issue? (Low / Medium / High)",
    description_prompt: "Please describe the issue in detail.",
    evidence_prompt_message: "Thank you for the details. Now, let's add some evidence.",
    edit_prompt: "Of course. Let's make corrections. Please describe the issue again from the beginning, including any changes you'd like to make.",
    geminiError: "I'm sorry, I'm having trouble connecting to my AI services. Please try again in a moment.",
    completed: "Thank you for sharing this issue. Your report has been recorded.",
    generatingSummary: "Generating AI Summary...",
    evidenceTitle: "Live Evidence Photo Capture",
    evidenceDescription: "Please add up to 3 photos. ({0}/3)",
    truthDetectorTitle: "AI Truth Detector 🕵️‍♂️",
    truthDetectorDescription: "Each photo is automatically analyzed to detect manipulation or AI generation, ensuring the authenticity of evidence.",
    emotionTitle: "New! Emotion Recognition 😊😡😭",
    emotionDescription: "If you submit a voice recording with your report, our AI can detect frustration or urgency in your tone. High-emotion cases may be prioritized for faster escalation.",
    next: "Next",
    skip: "Skip",
    submit: "Submit",
    submitReport: "Submit Report",
    notApplicable: "Not applicable",
    egMainStreet: "e.g., Main Street",
    egOldTemple: "e.g., Near the old temple",
    issueTitlePlaceholder: "e.g., Large pothole on Main Street",
    describeIssuePlaceholder: "Describe the issue in detail...",
    langCode: 'en-US',
    listening: 'Listening...',
    speechError: 'Sorry, I couldn\'t find a match for "{0}". Please try again or select from the list.',
  },
  ta: {
    welcome: "வணக்கம். நான் ஆர்யா, சிவிக் கார்டின் AI சமூக சேவை ஆய்வாளர். நீங்கள் புகாரளிக்கும் சிக்கலைப் ஆவணப்படுத்த நான் இங்கு இருக்கிறேன். தொடங்க, கீழே உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.",
    district_prompt: "நீங்கள் எந்த மாவட்டத்தில் இருந்து புகார் தெரிவிக்கிறீர்கள்?",
    panchayat_prompt: "தயவுசெய்து உங்கள் பஞ்சாயத்தின் பெயரை சொல்லுங்கள்.",
    village_prompt: "இந்த பிரச்சினை எந்த கிராமத்தில் உள்ளது?",
    street_prompt: "தெரு அல்லது பகுதியை உள்ளிடுங்கள்.",
    landmark_prompt: "அருகிலுள்ள ஒரு அடையாள இடத்தை சேர்க்க விரும்புகிறீர்களா? (விருப்பத்தேர்வு)",
    title_prompt: "பிரச்சினைக்கு ஒரு சுருக்கமான தலைப்பை கொடுங்கள்.",
    category_prompt: "பிரச்சினை வகையைத் தேர்ந்தெடுக்கவும். உதாரணம்: சாலைகள், தண்ணீர், மின்சாரம்.",
    urgency_prompt: "இந்த பிரச்சினை எவ்வளவு அவசரமானது? (குறைவு / நடுத்தரம் / அதிகம்)",
    description_prompt: "தயவுசெய்து பிரச்சினையை விரிவாக விவரிக்கவும்.",
    evidence_prompt_message: "விவரங்களுக்கு நன்றி. இப்போது, சில ஆதாரங்களைச் சேர்ப்போம்.",
    edit_prompt: "நிச்சயமாக. திருத்தங்கள் செய்வோம். நீங்கள் செய்ய விரும்பும் மாற்றங்கள் உட்பட, சிக்கலை மீண்டும் முதலில் இருந்து விவரிக்கவும்.",
    geminiError: "மன்னிக்கவும், எனது AI சேவைகளுடன் இணைவதில் சிக்கல் உள்ளது. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
    completed: "இந்தச் சிக்கலைப் பகிர்ந்தமைக்கு நன்றி. உங்கள் அறிக்கை பதிவு செய்யப்பட்டுள்ளது.",
    generatingSummary: "AI சுருக்கம் உருவாக்கப்படுகிறது...",
    evidenceTitle: "நேரடி ஆதாரப் புகைப்படப் பிடிப்பு",
    evidenceDescription: "தயவுசெய்து 3 புகைப்படங்கள் வரை சேர்க்கவும். ({0}/3)",
    truthDetectorTitle: "AI உண்மை கண்டறிதல் 🕵️‍♂️",
    truthDetectorDescription: "ஒவ்வொரு புகைப்படமும் தானாகவே பகுப்பாய்வு செய்யப்பட்டு, ஆதாரங்களின் நம்பகத்தன்மையை உறுதி செய்கிறது.",
    emotionTitle: "புதியது! உணர்ச்சி அங்கீகாரம் 😊😡😭",
    emotionDescription: "உங்கள் அறிக்கையுடன் குரல் பதிவைச் சமர்ப்பித்தால், எங்கள் AI உங்கள் குரலில் உள்ள விரக்தி அல்லது அவசரத்தைக் கண்டறியும். அதிக உணர்ச்சியுள்ள வழக்குகள் விரைவான நடவடிக்கைக்கு முன்னுரிமை அளிக்கப்படலாம்.",
    next: "அடுத்து",
    skip: "தவிர்",
    submit: "சமர்ப்பி",
    submitReport: "அறிக்கையை சமர்ப்பிக்கவும்",
    notApplicable: "பொருந்தாது",
    egMainStreet: "எ.கா., பிரதான தெரு",
    egOldTemple: "எ.கா., பழைய கோவிலுக்கு அருகில்",
    issueTitlePlaceholder: "எ.கா., பிரதான தெருவில் பெரிய பள்ளம்",
    describeIssuePlaceholder: "சிக்கலை விரிவாக விவரிக்கவும்...",
    langCode: 'ta-IN',
    listening: 'கேட்கிறது...',
    speechError: 'மன்னிக்கவும், "{0}"க்கு பொருத்தம் காணப்படவில்லை. மீண்டும் முயற்சிக்கவும் அல்லது பட்டியலிலிருந்து தேர்ந்தெடுக்கவும்.',
  },
  hi: {
    welcome: "नमस्ते। मैं आर्या, सिविकगार्ड की एक एआई सामाजिक सेवा अन्वेषक हूँ। मैं आपकी रिपोर्ट की गई समस्या का दस्तावेजीकरण करने में मदद करने के लिए यहाँ हूँ। शुरू करने के लिए, कृपया नीचे अपनी पसंदीदा भाषा चुनें।",
    district_prompt: "आप किस ज़िले से रिपोर्ट कर रहे हैं?",
    panchayat_prompt: "कृपया अपने पंचायत का नाम बताइए।",
    village_prompt: "यह समस्या किस गाँव में है?",
    street_prompt: "गली या क्षेत्र का नाम दर्ज करें।",
    landmark_prompt: "क्या आप पास का कोई लैंडमार्क जोड़ना चाहते हैं? (वैकल्पिक)",
    title_prompt: "समस्या के लिए एक छोटा शीर्षक दीजिए।",
    category_prompt: "समस्या का प्रकार चुनें। उदाहरण: सड़कें, पानी, बिजली।",
    urgency_prompt: "यह समस्या कितनी ज़रूरी है? (कम / मध्यम / अधिक)",
    description_prompt: "कृपया समस्या का विस्तार से वर्णन करें।",
    evidence_prompt_message: "विवरण के लिए धन्यवाद। अब, कुछ सबूत जोड़ते हैं।",
    edit_prompt: "बेशक। सुधार करते हैं। कृपया आप जो भी बदलाव करना चाहते हैं, उन्हें शामिल करते हुए, समस्या का फिर से शुरू से वर्णन करें।",
    geminiError: "मुझे खेद है, मुझे अपनी एआई सेवाओं से जुड़ने में समस्या हो रही है। कृपया कुछ देर में पुनः प्रयास करें।",
    completed: "इस मुद्दे को साझा करने के लिए धन्यवाद। आपकी रिपोर्ट दर्ज कर ली गई है।",
    generatingSummary: "एआई सारांश उत्पन्न हो रहा है...",
    evidenceTitle: "लाइव साक्ष्य फोटो कैप्चर",
    evidenceDescription: "कृपया 3 फ़ोटो तक जोड़ें। ({0}/3)",
    truthDetectorTitle: "एआई सत्य डिटेक्टर 🕵️‍♂️",
    truthDetectorDescription: "प्रत्येक तस्वीर का स्वचालित रूप से विश्लेषण किया जाता है ताकि हेरफेर या एआई द्वारा निर्माण का पता लगाया जा सके, जिससे साक्ष्य की प्रामाणिकता सुनिश्चित हो सके।",
    emotionTitle: "नया! भावना पहचान 😊😡😭",
    emotionDescription: "यदि आप अपनी रिपोर्ट के साथ वॉयस रिकॉर्डिंग जमा करते हैं, तो हमारा AI आपकी आवाज़ में निराशा या तात्कालिकता का पता लगा सकता है। उच्च-भावना वाले मामलों को तेजी से समाधान के लिए प्राथमिकता दी जा सकती है।",
    next: "अगला",
    skip: "छोड़ें",
    submit: "प्रस्तुत करें",
    submitReport: "रिपोर्ट जमा करें",
    notApplicable: "लागू नहीं",
    egMainStreet: "जैसे, मुख्य सड़क",
    egOldTemple: "जैसे, पुराने मंदिर के पास",
    issueTitlePlaceholder: "जैसे, मुख्य सड़क पर बड़ा गड्ढा",
    describeIssuePlaceholder: "समस्या का विस्तार से वर्णन करें...",
    langCode: 'hi-IN',
    listening: 'सुन रहा है...',
    speechError: 'क्षमा करें, मुझे "{0}" के लिए कोई मेल नहीं मिला। कृपया पुनः प्रयास करें या सूची से चयन करें।',
  }
};

const FormSection: React.FC<{title: string, children: React.ReactNode, description?: string}> = ({title, children, description}) => (
    <div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>}
        {children}
    </div>
);

const stageOrder: ConversationStage[] = ['district', 'panchayat', 'village', 'street', 'landmark', 'title', 'category', 'urgency', 'description', 'evidence'];

const ReporterAgent: React.FC<ReporterAgentProps> = ({ onBack, onSubmit, user }) => {
  const [stage, setStage] = useState<ConversationStage>('language');
  const [language, setLanguage] = useState<Language>('en');
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [conversation, setConversation] = useState<{ role: 'bot' | 'user'; content: string }[]>([]);

  const T = translations[language];
  
  // Location state
  const [districtNames, setDistrictNames] = useState<string[]>([]);
  const [panchayatOptions, setPanchayatOptions] = useState<string[]>([]);
  const [villageOptions, setVillageOptions] = useState<string[]>([]);
  const [selectedDistrictData, setSelectedDistrictData] = useState<District | null>(null);

  // Form state
  const [district, setDistrict] = useState<string>(user.district || '');
  const [panchayat, setPanchayat] = useState<string>(user.panchayat || '');
  const [village, setVillage] = useState<string>(user.village || '');
  const [street, setStreet] = useState<string>(user.street || '');
  const [landmark, setLandmark] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Roads');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [description, setDescription] = useState('');
  
  // Evidence state
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [audioEvidence, setAudioEvidence] = useState<{ blob: Blob, dataURL: string } | null>(null);
  const [videoEvidence, setVideoEvidence] = useState<string | null>(null);
  const [videoGps, setVideoGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  
  // Voice state
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const allAnalysesDone = useMemo(() => evidenceList.every(e => e.analysis !== 'pending'), [evidenceList]);
  const conversationContentRef = useRef<HTMLDivElement>(null);

  const speak = useCallback(async (text: string, langCodeOverride?: string) => {
    if (!isTtsEnabled || !('speechSynthesis' in window) || !text.trim()) return;
    window.speechSynthesis.cancel();
    
    try {
        const voices = await getVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = langCodeOverride || T.langCode;
        const normalizedTargetLang = targetLang.replace('_', '-').toLowerCase();
        
        const voice = voices.find(v => v.lang.replace('_', '-').toLowerCase() === normalizedTargetLang);
        if (voice) utterance.voice = voice;
        else console.warn(`TTS voice for '${targetLang}' not found. Using default.`);
        
        utterance.lang = targetLang;
        window.speechSynthesis.speak(utterance);
    } catch (error) { console.error("TTS error:", error); }
  }, [isTtsEnabled, T.langCode]);

  useEffect(() => {
    conversationContentRef.current?.scrollTo(0, conversationContentRef.current.scrollHeight);
  }, [conversation]);

  // Speech Recognition Setup
  useEffect(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) { console.warn("Speech recognition not supported."); return; }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = T.langCode;
      
      recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          const isFinal = event.results[event.results.length - 1].isFinal;
          
          switch(stage) {
            case 'street': setStreet(transcript); break;
            case 'landmark': setLandmark(transcript); break;
            case 'title': setTitle(transcript); break;
            case 'description': setDescription(transcript); break;
          }

          if (isFinal) {
              handleSpeechRecognitionResult(transcript.trim());
          }
      };
      
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => { console.error("Speech recognition error:", event.error); setIsListening(false); };
      recognitionRef.current = recognition;

      return () => {
        recognition.stop();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      };
  }, [T.langCode, stage]); // Re-initialize if language or stage changes

  useEffect(() => {
    getDistrictNames().then(names => { setDistrictNames(names); if (!user.district && names.length > 0) setDistrict(names[0]); });
  }, [user.district]);
  
  useEffect(() => {
    if (!district) { setSelectedDistrictData(null); return; }
    getDistrictData(district).then(data => setSelectedDistrictData(data));
  }, [district]);

  useEffect(() => {
    const panchayatNames = selectedDistrictData?.panchayats?.map(p => p.name) || [];
    setPanchayatOptions(panchayatNames);
     if (panchayatNames.length > 0 && (!user.panchayat || !panchayatNames.includes(user.panchayat))) setPanchayat(panchayatNames[0]);
  }, [selectedDistrictData, user.panchayat]);
  
  useEffect(() => {
    if (!panchayat) { setVillageOptions([]); setVillage(''); return; }
    const selectedPanchayat = selectedDistrictData?.panchayats?.find(p => p.name === panchayat);
    const villageNames = selectedPanchayat?.villages || [];
    setVillageOptions(villageNames);
    if (villageNames.length > 0 && (!user.village || !villageNames.includes(user.village))) setVillage(villageNames[0]);
  }, [panchayat, selectedDistrictData, user.village]);

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setStage('district');
    const welcomeMsg = translations[lang].district_prompt;
    setConversation([{ role: 'bot', content: welcomeMsg }]);
    speak(welcomeMsg, translations[lang].langCode);
  };
  
  const handleAdvance = useCallback((e: React.FormEvent | null, value: string, skipped = false) => {
    e?.preventDefault();
    const currentStageIndex = stageOrder.indexOf(stage);

    if (stage === 'street' && !street.trim()) { alert('Street/Locality is required.'); return; }
    if (stage === 'title' && !title.trim()) { alert('Issue title is required.'); return; }
    if (stage === 'description' && !description.trim()) { alert('Description is required.'); return; }
    
    setConversation(prev => [...prev, { role: 'user', content: skipped ? '(Skipped)' : value }]);

    if (currentStageIndex < stageOrder.length - 1) {
        const nextStage = stageOrder[currentStageIndex + 1];
        setStage(nextStage);
        const nextPromptKey = `${nextStage}_prompt` as keyof typeof T;
        const nextPrompt = T[nextPromptKey] || T.evidence_prompt_message;
        setTimeout(() => {
             setConversation(prev => [...prev, { role: 'bot', content: nextPrompt }]);
             speak(nextPrompt);
        }, 300);
    }
  }, [stage, T, street, title, description, speak]);

  const findBestMatch = (query: string, options: string[]): string | null => {
      const lowerQuery = query.toLowerCase().trim();
      const exactMatch = options.find(opt => opt.toLowerCase() === lowerQuery);
      if (exactMatch) return exactMatch;
      const includesMatch = options.find(opt => opt.toLowerCase().includes(lowerQuery));
      if (includesMatch) return includesMatch;
      return null;
  };

  const handleSpeechRecognitionResult = (transcript: string) => {
      if (!transcript) return;
      let advance = false;
      let userMessage = transcript;

      const findAndSet = (query: string, options: string[], setter: (val: any) => void): boolean => {
          const match = findBestMatch(query, options);
          if(match) {
              setter(match);
              userMessage = match;
              return true;
          }
          speak(T.speechError.replace('{0}', query));
          return false;
      };

      switch (stage) {
          case 'district': advance = findAndSet(transcript, districtNames, setDistrict); break;
          case 'panchayat': advance = findAndSet(transcript, panchayatOptions, setPanchayat); break;
          case 'village': advance = findAndSet(transcript, villageOptions, setVillage); break;
          case 'category': advance = findAndSet(transcript, ['Roads', 'Waste', 'Water', 'Electricity', 'Public Infrastructure', 'Other'], setCategory); break;
          case 'urgency': advance = findAndSet(transcript, ['Low', 'Medium', 'High'], setUrgency); break;
          case 'street': setStreet(transcript); advance = true; break;
          case 'landmark': setLandmark(transcript); advance = true; break;
          case 'title': setTitle(transcript); advance = true; break;
          case 'description': setDescription(transcript); advance = true; break;
      }
      if (advance) {
          handleAdvance(null, userMessage);
      }
  };

  const handleMicClick = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleToggleTts = () => {
    const newState = !isTtsEnabled;
    setIsTtsEnabled(newState);
    if (!newState) window.speechSynthesis.cancel();
  };

  const analyzeImage = async (photoDataUrl: string, index: number) => {
    const base64Image = photoDataUrl.split(',')[1];
    const result = await analyzeImageAuthenticity(base64Image);
    setEvidenceList(prevList => {
        const updatedList = [...prevList];
        if (updatedList[index]) { updatedList[index].analysis = result; }
        return updatedList;
    });
  };

  const handleEvidenceCapture = (data: { photo: string; gps: any; timestamp: string; }) => {
    if (evidenceList.length < 3) {
        const newEvidence: Evidence = { ...data, analysis: 'pending' };
        const newEvidenceList = [...evidenceList, newEvidence];
        setEvidenceList(newEvidenceList);
        analyzeImage(data.photo, newEvidenceList.length - 1);
    }
  };

  const removeEvidence = (index: number) => setEvidenceList(prevList => prevList.filter((_, i) => i !== index));
  
  const handleVideoDataChange = (data: { videoURL: string | null; gps: { lat: number; lng: number; accuracy: number } | null }) => {
    setVideoEvidence(data.videoURL);
    setVideoGps(data.gps);
  };

  const handleGenerateSummary = async () => {
    if (evidenceList.length === 0 || !videoEvidence) {
        alert('Please capture at least one photo and record a video as evidence.');
        return;
    }
    setStage('processing');

    let emotionAnalysisResult: { sentiment: string; urgencyScore: number } | null = null;
    if (audioEvidence) {
        try {
            const audioPart = { inlineData: { mimeType: audioEvidence.blob.type, data: audioEvidence.dataURL.split(',')[1] } };
            const textPart = { text: "Analyze the user's voice in this audio clip. Describe their emotional state (e.g., calm, frustrated, angry, distressed). Based on their tone, rate the urgency of the issue on a scale from 1 (very low) to 10 (very high). Return ONLY a JSON object with 'sentiment' (string) and 'urgencyScore' (number) keys." };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: { parts: [audioPart, textPart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { sentiment: { type: Type.STRING }, urgencyScore: { type: Type.NUMBER } }, required: ["sentiment", "urgencyScore"] },
                },
            });
            emotionAnalysisResult = JSON.parse(response.text.trim());
        } catch(err) { console.error("Emotion analysis failed:", err); }
    }

    const reportText = `Issue Report:\n- Title: ${title}\n- Category: ${category}\n- Urgency: ${urgency}\nLocation:\n- District: ${district}\n- Panchayat: ${panchayat}\n- Village: ${village}\n- Street/Locality: ${street}\n- Landmark (optional): ${landmark || 'Not provided'}\nDescription:\n- ${description}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: reportText,
        config: {
          systemInstruction: "You are an AI assistant for a civic reporting app. Your task is to process a user's raw text report about a local issue and convert it into a structured, official summary. The user will provide details like location, category, urgency, and a description. You MUST return ONLY a JSON object with the following exact schema: { \"reporterDetails\": \"string\", \"issueDescription\": \"string\", \"district\": \"string\", \"panchayat\": \"string\", \"village\": \"string\", \"street\": \"string\", \"locationDetails\": \"string\", \"dateTime\": \"string\", \"affectedPeopleCommunity\": \"string\", \"urgencyLevel\": \"'Low' | 'Medium' | 'High'\", \"finalSummaryRecommendation\": \"string\" }. Use the user's input to fill these fields. For 'reporterDetails', combine the provided contact info or state 'Not provided'. For 'dateTime', use the current date and time in a readable format (e.g., 'July 26, 2024, 10:30 AM'). For 'affectedPeopleCommunity', infer from the description (e.g., 'Local residents', 'Commuters'). For 'urgencyLevel', use the user's selection but you may upgrade it to 'High' if the description contains keywords like 'dangerous', 'hazard', 'urgent', 'fire', 'accident'. For 'finalSummaryRecommendation', write a concise, one-sentence summary of the issue and a recommended action (e.g., 'A large pothole on Main Street requires immediate repair to prevent accidents.'). Be professional and clear.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { reporterDetails: { type: Type.STRING }, issueDescription: { type: Type.STRING }, district: { type: Type.STRING }, panchayat: { type: Type.STRING }, village: { type: Type.STRING }, street: { type: Type.STRING }, locationDetails: { type: Type.STRING }, dateTime: { type: Type.STRING }, affectedPeopleCommunity: { type: Type.STRING }, urgencyLevel: { type: Type.STRING }, finalSummaryRecommendation: { type: Type.STRING }},
            required: ["issueDescription", "district", "panchayat", "village", "street", "dateTime", "affectedPeopleCommunity", "urgencyLevel", "finalSummaryRecommendation"]
          }
        }
      });
      const generatedReport = JSON.parse(response.text.trim());
      let gpsData = evidenceList.find(e => e.gps)?.gps || videoGps || null;
      if (!gpsData && navigator.geolocation) {
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000 }));
            gpsData = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        } catch (err) { console.warn("Final GPS fallback failed in AI agent:", err); }
      }

      setFinalReport({ ...generatedReport, title: title, emotionAnalysis: emotionAnalysisResult, imageAnalyses: evidenceList.map(e => e.analysis).filter(a => a !== 'pending' && a), _photos: evidenceList.map(e => e.photo), _gps: gpsData, _audioURL: audioEvidence?.dataURL, _videoURL: videoEvidence, category: category });
      setStage('summary');
    } catch (error) { console.error("Gemini API error:", error); alert(T.geminiError); setStage('evidence'); }
  };
  
  const handleConfirmReport = () => { onSubmit(finalReport); setStage('completed'); };
  const handleEditReport = () => { setStage('district'); setConversation([{ role: 'bot', content: T.district_prompt }]); };
  
  const AnalysisBadge: React.FC<{ analysis?: AnalysisStatus | 'pending' }> = ({ analysis }) => {
    if (!analysis) return null;
    const wrapperClasses = "absolute bottom-1 right-1 bg-black/50 rounded-full p-1 text-white flex items-center justify-center";
    if (analysis === 'pending') return <div className={wrapperClasses} title="Verifying..."><SpinnerIcon /></div>;
    const { status, confidence, reasoning } = analysis;
    const title = `${status} (Confidence: ${(confidence * 100).toFixed(0)}%) - ${reasoning}`;
    switch (status) {
        case 'Authentic': return <div className={wrapperClasses} title={title}><CheckCircleIcon className="w-5 h-5 text-green-400" /></div>;
        case 'Manipulated': return <div className={wrapperClasses} title={title}><ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" /></div>;
        case 'AI-Generated': return <div className={wrapperClasses} title={title}><RobotIcon className="w-5 h-5 text-red-400" /></div>;
        default: return null;
    }
  };

  const renderContent = () => {
    const currentStageIndex = stageOrder.indexOf(stage);
    const progress = currentStageIndex >= 0 ? ((currentStageIndex) / (stageOrder.length - 2)) * 100 : 0;
    
    const renderConversationInput = () => {
        const MicButton = () => (
            <button type="button" onClick={handleMicClick} className={`p-2 rounded-full ${isListening ? 'bg-red-200 text-red-600 animate-pulse' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200'}`} aria-label={isListening ? "Stop listening" : "Start listening"}>
                <MicIcon className="w-5 h-5"/>
            </button>
        );

        switch(stage) {
            case 'district': return (<form onSubmit={e => handleAdvance(e, district)} className="flex gap-2 items-center"><select value={district} onChange={e => setDistrict(e.target.value)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">{districtNames.map(d => <option key={d} value={d}>{d}</option>)}</select><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'panchayat': return (<form onSubmit={e => handleAdvance(e, panchayat)} className="flex gap-2 items-center"><select value={panchayat} onChange={e => setPanchayat(e.target.value)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">{panchayatOptions.length > 0 ? panchayatOptions.map(p => <option key={p} value={p}>{p}</option>) : <option>{T.notApplicable}</option>}</select><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'village': return (<form onSubmit={e => handleAdvance(e, village)} className="flex gap-2 items-center"><select value={village} onChange={e => setVillage(e.target.value)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">{villageOptions.length > 0 ? villageOptions.map(v => <option key={v} value={v}>{v}</option>) : <option>{T.notApplicable}</option>}</select><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'street': return (<form onSubmit={e => handleAdvance(e, street)} className="flex gap-2 items-center"><input type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder={isListening ? T.listening : T.egMainStreet} required className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" /><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'landmark': return (<form onSubmit={e => handleAdvance(e, landmark)} className="flex gap-2 items-center"><input type="text" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder={isListening ? T.listening : T.egOldTemple} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" /><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button><button type="button" onClick={(e) => handleAdvance(e as any, landmark, true)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md">{T.skip}</button></form>);
            case 'title': return (<form onSubmit={e => handleAdvance(e, title)} className="flex gap-2 items-center"><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={isListening ? T.listening : T.issueTitlePlaceholder} required className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700" /><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'category': return (<form onSubmit={e => handleAdvance(e, category)} className="flex gap-2 items-center"><select value={category} onChange={e => setCategory(e.target.value)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">{['Roads', 'Waste', 'Water', 'Electricity', 'Public Infrastructure', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}</select><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'urgency': return (<form onSubmit={e => handleAdvance(e, urgency)} className="flex gap-2 items-center"><select value={urgency} onChange={e => setUrgency(e.target.value as any)} className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select><MicButton /><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">{T.next}</button></form>);
            case 'description': return (<form onSubmit={e => handleAdvance(e, description)} className="flex flex-col gap-2"><div className="flex gap-2 items-start"><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder={isListening ? T.listening : T.describeIssuePlaceholder} required className="flex-grow p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"></textarea><MicButton /></div><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md self-end">{T.submit}</button></form>);
            default: return null;
        }
    };

    switch (stage) {
      case 'language': return (<div className="text-center p-8"><p className="mb-6">{T.welcome}</p><div className="flex justify-center gap-4"><button onClick={() => handleLanguageSelect('en')} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">English</button><button onClick={() => handleLanguageSelect('ta')} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">தமிழ்</button><button onClick={() => handleLanguageSelect('hi')} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">हिन्दी</button></div></div>);
      case 'evidence': return (<div className="p-4 space-y-6 animate-fade-in"><FormSection title={T.evidenceTitle} description={T.evidenceDescription.replace('{0}', String(evidenceList.length))}><div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">{evidenceList.length > 0 && (<div className="grid grid-cols-3 gap-4 mb-4">{evidenceList.map((evidence, index) => (<div key={index} className="relative group"><img src={evidence.photo} alt={`Evidence ${index + 1}`} className="rounded-lg object-cover w-full h-24 cursor-pointer" onClick={() => setSelectedPhoto(evidence.photo)}/><AnalysisBadge analysis={evidence.analysis} /><button type="button" onClick={() => removeEvidence(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove photo">&times;</button></div>))}</div>)}{evidenceList.length < 3 ? <CameraCapture onCapture={handleEvidenceCapture} district={district} panchayat={panchayat} village={village} /> : <p className="text-center text-green-600 dark:text-green-400 font-semibold">Maximum number of photos reached.</p>}</div></FormSection><FormSection title={T.truthDetectorTitle} description={T.truthDetectorDescription} /><FormSection title="Record Video (Required)" description="A 30-second video of the issue is required. The recording will stop automatically after 30 seconds."><VideoRecorder onVideoChange={handleVideoDataChange} currentVideoUrl={videoEvidence} district={district} panchayat={panchayat} village={village} /></FormSection><FormSection title={T.emotionTitle} description={T.emotionDescription}><EmotionRecorder onRecordComplete={setAudioEvidence} /></FormSection><div className="mt-8 flex justify-end"><button type="button" onClick={handleGenerateSummary} className="w-full px-6 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed" disabled={evidenceList.length === 0 || !videoEvidence || !allAnalysesDone}>{T.submitReport}</button></div>{selectedPhoto && (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhoto(null)}><div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}><img src={selectedPhoto} alt="Evidence preview" className="rounded-lg object-contain w-full h-full" /><button onClick={() => setSelectedPhoto(null)} className="absolute -top-2 -right-2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-xl shadow-lg">&times;</button></div></div>)}</div>);
      case 'processing': return (<div className="flex flex-col items-center justify-center p-8 h-full"><SpinnerIcon /><p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{T.generatingSummary}</p></div>);
      case 'summary': return finalReport ? (<ReportSummary issue={finalReport} onConfirm={handleConfirmReport} onEdit={handleEditReport} />) : null;
      case 'completed': return (<div className="text-center p-8"><h2 className="text-2xl font-bold mb-4">{T.completed}</h2><button onClick={onBack} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">Done</button></div>);
      default: return (
        <div className="h-full flex flex-col p-4">
             <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{width: `${progress}%`}}></div>
            </div>
            <div ref={conversationContentRef} className="flex-1 space-y-4 overflow-y-auto mb-4">
                {conversation.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       {msg.role === 'bot' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white flex-shrink-0"><RobotIcon className="w-5 h-5" /></div>}
                       <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl animate-fade-in ${msg.role === 'user' ? 'bg-indigo-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                           <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content }}></p>
                       </div>
                    </div>
                ))}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                {renderConversationInput()}
            </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-full max-h-[85vh] flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button onClick={stage === 'summary' ? handleEditReport : onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
          <ChevronLeftIcon />
          Back
        </button>
        <div className="flex-1" />
        <button onClick={handleToggleTts} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600" aria-label={isTtsEnabled ? "Disable text-to-speech" : "Enable text-to-speech"}>
          {isTtsEnabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default ReporterAgent;
