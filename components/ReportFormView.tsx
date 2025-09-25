

import React, { useState, useEffect, useMemo } from 'react';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import { getDistrictNames, getDistrictData, District } from '../data/locationService';
import CameraCapture from './CameraCapture';
import { Issue } from '../types';
import EmotionRecorder from './EmotionRecorder';
import { analyzeImageAuthenticity } from '../services/geminiService';
import SpinnerIcon from './icons/SpinnerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import RobotIcon from './icons/RobotIcon';
import VideoRecorder from './VideoRecorder';

interface ReportFormViewProps {
    onBack: () => void;
    onSubmit: (formData: any) => void;
    issueToEdit?: Issue | null;
}

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

type Language = 'en' | 'ta' | 'hi';

const translations: Record<Language, Record<string, string>> = {
  en: {
    welcome_manual: "To start, please choose your preferred language below.",
    editReportTitle: "Edit Report",
    newReportTitle: "Report a New Issue",
    step1Title: "Step 1: Report Details",
    step2Title: "Step 2: Add Evidence",
    // Form Labels
    locationDetails: "Location Details",
    district: "District",
    panchayat: "Panchayat",
    village: "Village",
    streetLocality: "Street / Locality",
    landmarkOptional: "Landmark (Optional)",
    issueDetails: "Issue Details",
    issueTitle: "Issue Title / Name",
    categoryIssueType: "Category / Issue Type",
    urgencyLevel: "Urgency Level",
    describeIssue: "Description / Remarks",
    contactInfoOptional: "Contact Info (Optional)",
    contactInfoDescription: "Provide alternate details if you are reporting on behalf of someone else. Your profile info will be used by default.",
    contactName: "Name",
    contactMobile: "Mobile",
    contactEmail: "Email",
    nextAddEvidence: "Next: Add Evidence",
    nextUpdateEvidence: "Next: Update Evidence",
    submitReport: "Submit Report",
    updateReport: "Update Report",
    processing: "Processing...",
    verifying: "Verifying...",
    // Placeholders
    egMainStreet: "e.g., Main Street",
    egOldTemple: "e.g., Near the old temple",
    issueTitlePlaceholder: "e.g., Large pothole on Main Street",
    describeIssuePlaceholder: "Describe the issue in detail...",
    reporterNamePlaceholder: "Reporter's name",
    reporterMobilePlaceholder: "Reporter's mobile number",
    reporterEmailPlaceholder: "Reporter's email",
    notApplicable: "Not applicable",
    // Evidence Section
    evidenceTitle: "Live Evidence Photo Capture",
    evidenceDescription: "Please add up to 3 photos. ({0}/3)",
    truthDetectorTitle: "AI Truth Detector 🕵️‍♂️",
    truthDetectorDescription: "Each photo is automatically analyzed to detect manipulation or AI generation, ensuring the authenticity of evidence.",
    emotionTitle: "New! Emotion Recognition 😊😡😭",
    emotionDescription: "If you submit a voice recording with your report, our AI can detect frustration or urgency in your tone. High-emotion cases may be prioritized for faster escalation.",
    currentPhotos: "Current Photos:",
    currentPhotosNote: "To change photos, capture new ones below. Otherwise, the current photos will be kept.",
    maxPhotos: "Maximum number of photos reached.",
  },
  ta: {
    welcome_manual: "தொடங்க, கீழே உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்.",
    editReportTitle: "அறிக்கையைத் திருத்து",
    newReportTitle: "புதிய சிக்கலைப் புகாரளிக்கவும்",
    step1Title: "படி 1: அறிக்கை விவரங்கள்",
    step2Title: "படி 2: ஆதாரத்தைச் சேர்க்கவும்",
    locationDetails: "இடத்தின் விவரங்கள்",
    district: "மாவட்டம்",
    panchayat: "பஞ்சாயத்து",
    village: "கிராமம்",
    streetLocality: "தெரு / பகுதி",
    landmarkOptional: "அடையாளம் (விருப்பத்தேர்வு)",
    issueDetails: "சிக்கல் விவரங்கள்",
    issueTitle: "சிக்கலின் தலைப்பு / பெயர்",
    categoryIssueType: "வகை / சிக்கல் வகை",
    urgencyLevel: "அவசர நிலை",
    describeIssue: "விளக்கம் / கருத்துகள்",
    contactInfoOptional: "தொடர்பு தகவல் (விருப்பத்தேர்வு)",
    contactInfoDescription: "நீங்கள் வேறு யாருக்காகவோ புகாரளித்தால் மாற்று விவரங்களை வழங்கவும். உங்கள் சுயவிவரத் தகவல் இயல்பாகப் பயன்படுத்தப்படும்.",
    contactName: "பெயர்",
    contactMobile: "கைபேசி",
    contactEmail: "மின்னஞ்சல்",
    nextAddEvidence: "அடுத்து: ஆதாரத்தைச் சேர்",
    nextUpdateEvidence: "அடுத்து: ஆதாரத்தைப் புதுப்பிக்கவும்",
    submitReport: "அறிக்கையைச் சமர்ப்பி",
    updateReport: "அறிக்கையைப் புதுப்பிக்கவும்",
    processing: "செயலாக்கப்படுகிறது...",
    verifying: "சரிபார்க்கிறது...",
    egMainStreet: "எ.கா., பிரதான தெரு",
    egOldTemple: "எ.கா., பழைய கோவிலுக்கு அருகில்",
    issueTitlePlaceholder: "எ.கா., பிரதான தெருவில் பெரிய பள்ளம்",
    describeIssuePlaceholder: "சிக்கலை விரிவாக விவரிக்கவும்...",
    reporterNamePlaceholder: "புகாரளிப்பவரின் பெயர்",
    reporterMobilePlaceholder: "புகாரளிப்பவரின் கைபேசி எண்",
    reporterEmailPlaceholder: "புகாரளிப்பவரின் மின்னஞ்சல்",
    notApplicable: "பொருந்தாது",
    evidenceTitle: "நேரடி ஆதாரப் புகைப்படப் பிடிப்பு",
    evidenceDescription: "தயவுசெய்து 3 புகைப்படங்கள் வரை சேர்க்கவும். ({0}/3)",
    truthDetectorTitle: "AI உண்மை கண்டறிதல் 🕵️‍♂️",
    truthDetectorDescription: "ஒவ்வொரு புகைப்படமும் தானாகவே பகுப்பாய்வு செய்யப்பட்டு, ஆதாரங்களின் நம்பகத்தன்மையை உறுதி செய்கிறது.",
    emotionTitle: "புதியது! உணர்ச்சி அங்கீகாரம் 😊😡😭",
    emotionDescription: "உங்கள் அறிக்கையுடன் குரல் பதிவைச் சமர்ப்பித்தால், எங்கள் AI உங்கள் குரலில் உள்ள விரக்தி அல்லது அவசரத்தைக் கண்டறியும். அதிக உணர்ச்சியுள்ள வழக்குகள் விரைவான நடவடிக்கைக்கு முன்னுரிமை அளிக்கப்படலாம்.",
    currentPhotos: "தற்போதைய புகைப்படங்கள்:",
    currentPhotosNote: "புகைப்படங்களை மாற்ற, கீழே புதியவற்றைப் பிடிக்கவும். இல்லையெனில், தற்போதைய புகைப்படங்கள் வைக்கப்படும்.",
    maxPhotos: "அதிகபட்ச புகைப்படங்களின் எண்ணிக்கை எட்டப்பட்டது.",
  },
  hi: {
    welcome_manual: "शुरू करने के लिए, कृपया नीचे अपनी पसंदीदा भाषा चुनें।",
    editReportTitle: "रिपोर्ट संपादित करें",
    newReportTitle: "एक नई समस्या की रिपोर्ट करें",
    step1Title: "चरण 1: रिपोर्ट विवरण",
    step2Title: "चरण 2: साक्ष्य जोड़ें",
    locationDetails: "स्थान विवरण",
    district: "ज़िला",
    panchayat: "पंचायत",
    village: "गाँव",
    streetLocality: "गली / मोहल्ला",
    landmarkOptional: "लैंडमार्क (वैकल्पिक)",
    issueDetails: "समस्या का विवरण",
    issueTitle: "समस्या का शीर्षक / नाम",
    categoryIssueType: "श्रेणी / समस्या का प्रकार",
    urgencyLevel: "तत्कालकता स्तर",
    describeIssue: "विवरण / टिप्पणियाँ",
    contactInfoOptional: "संपर्क जानकारी (वैकल्पिक)",
    contactInfoDescription: "यदि आप किसी और की ओर से रिपोर्ट कर रहे हैं तो वैकल्पिक विवरण प्रदान करें। आपकी प्रोफ़ाइल जानकारी डिफ़ॉल्ट रूप से उपयोग की जाएगी।",
    contactName: "नाम",
    contactMobile: "मोबाइल",
    contactEmail: "ईमेल",
    nextAddEvidence: "अगला: साक्ष्य जोड़ें",
    nextUpdateEvidence: "अगला: साक्ष्य अपडेट करें",
    submitReport: "रिपोर्ट सबमिट करें",
    updateReport: "रिपोर्ट अपडेट करें",
    processing: "संसाधित हो रहा है...",
    verifying: "सत्यापित हो रहा है...",
    egMainStreet: "जैसे, मुख्य सड़क",
    egOldTemple: "जैसे, पुराने मंदिर के पास",
    issueTitlePlaceholder: "जैसे, मुख्य सड़क पर बड़ा गड्ढा",
    describeIssuePlaceholder: "समस्या का विस्तार से वर्णन करें...",
    reporterNamePlaceholder: "रिपोर्टर का नाम",
    reporterMobilePlaceholder: "रिपोर्टर का मोबाइल नंबर",
    reporterEmailPlaceholder: "रिपोर्टर का ईमेल",
    notApplicable: "लागू नहीं",
    evidenceTitle: "लाइव साक्ष्य फोटो कैप्चर",
    evidenceDescription: "कृपया 3 फ़ोटो तक जोड़ें। ({0}/3)",
    truthDetectorTitle: "एआई सत्य डिटेक्टर 🕵️‍♂️",
    truthDetectorDescription: "प्रत्येक तस्वीर का स्वचालित रूप से विश्लेषण किया जाता है ताकि हेरफेर या एआई द्वारा निर्माण का पता लगाया जा सके, जिससे साक्ष्य की प्रामाणिकता सुनिश्चित हो सके।",
    emotionTitle: "नया! भावना पहचान 😊😡😭",
    emotionDescription: "यदि आप अपनी रिपोर्ट के साथ वॉयस रिकॉर्डिंग जमा करते हैं, तो हमारा AI आपकी आवाज़ में निराशा या तात्कालिकता का पता लगा सकता है। उच्च-भावना वाले मामलों को तेजी से समाधान के लिए प्राथमिकता दी जा सकती है।",
    currentPhotos: "वर्तमान तस्वीरें:",
    currentPhotosNote: "तस्वीरें बदलने के लिए, नीचे नई तस्वीरें कैप्चर करें। अन्यथा, वर्तमान तस्वीरें रखी जाएंगी।",
    maxPhotos: "अधिकतम तस्वीरों की संख्या तक पहुंच गया है।",
  }
};

const FormSection: React.FC<{title: string, children: React.ReactNode, description?: string}> = ({title, children, description}) => (
    <div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>}
        {children}
    </div>
);

const InputField: React.FC<{label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, type?: string, required?: boolean}> = (props) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{props.label}</label>
        <input {...props} id={props.id} type={props.type || 'text'} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" />
    </div>
);

const SelectField: React.FC<{label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, children: React.ReactNode}> = (props) => (
     <div>
        <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{props.label}</label>
        <select {...props} id={props.id} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700">
            {props.children}
        </select>
    </div>
);

const ReportFormView: React.FC<ReportFormViewProps> = ({ onBack, onSubmit, issueToEdit }) => {
    const [language, setLanguage] = useState<Language>('en');
    const [step, setStep] = useState(issueToEdit ? 1 : 0); // Skip lang select if editing
    const [isSubmitting, setIsSubmitting] = useState(false);
    const T = translations[language];

    // Location state
    const [districts, setDistricts] = useState<string[]>([]);
    const [panchayats, setPanchayats] = useState<string[]>([]);
    const [villages, setVillages] = useState<string[]>([]);
    const [selectedDistrictData, setSelectedDistrictData] = useState<District | null>(null);

    // Form State
    const [district, setDistrict] = useState<string>(issueToEdit?.location.district || '');
    const [panchayat, setPanchayat] = useState<string>(issueToEdit?.location.panchayat || '');
    const [village, setVillage] = useState<string>(issueToEdit?.location.village || '');
    const [street, setStreet] = useState<string>(issueToEdit?.location.street || '');
    const [landmark, setLandmark] = useState('');
    
    const [title, setTitle] = useState(issueToEdit?.title || '');
    const [category, setCategory] = useState(issueToEdit?.category || 'Roads');
    const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>(issueToEdit?.urgency || 'Medium');
    const [description, setDescription] = useState(issueToEdit?.description || '');

    // Evidence State
    const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [audioEvidence, setAudioEvidence] = useState<{ blob: Blob, dataURL: string } | null>(null);
    const [videoEvidence, setVideoEvidence] = useState<string | null>(issueToEdit?.video || null);
    const [videoGps, setVideoGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

    const allAnalysesDone = useMemo(() => evidenceList.every(e => e.analysis !== 'pending'), [evidenceList]);

    useEffect(() => {
        getDistrictNames().then(names => {
            setDistricts(names);
            if (!issueToEdit && names.length > 0) {
                setDistrict(names[0]);
            }
        });
    }, [issueToEdit]);

    useEffect(() => {
        if (!district) {
            setSelectedDistrictData(null);
            return;
        }
        getDistrictData(district).then(data => {
            setSelectedDistrictData(data);
        });
    }, [district]);

    useEffect(() => {
        const panchayatNames = selectedDistrictData?.panchayats?.map(p => p.name) || [];
        setPanchayats(panchayatNames);
        if (!issueToEdit || district !== issueToEdit.location.district) {
            setPanchayat(panchayatNames[0] || '');
        }
    }, [selectedDistrictData, issueToEdit, district]);
    
    useEffect(() => {
        if (!panchayat) {
            setVillages([]);
            setVillage('');
            return;
        }
        const selectedPanchayat = selectedDistrictData?.panchayats?.find(p => p.name === panchayat);
        const villageNames = selectedPanchayat?.villages || [];
        setVillages(villageNames);
        if (!issueToEdit || panchayat !== issueToEdit.location.panchayat) {
            setVillage(villageNames[0] || '');
        }
    }, [panchayat, selectedDistrictData, issueToEdit]);

    
    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !street.trim() || !description.trim()) {
            alert('Please fill in Issue Title, Street/Locality and Description.');
            return;
        }
        setStep(2);
    };

    const analyzeImage = async (photoDataUrl: string, index: number) => {
        const base64Image = photoDataUrl.split(',')[1];
        const result = await analyzeImageAuthenticity(base64Image);
        setEvidenceList(prevList => {
            const updatedList = [...prevList];
            if (updatedList[index]) {
                updatedList[index].analysis = result;
            }
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

    const removeEvidence = (index: number) => {
        setEvidenceList(prevList => prevList.filter((_, i) => i !== index));
    };
    
    const handleVideoDataChange = (data: { videoURL: string | null; gps: { lat: number; lng: number; accuracy: number } | null }) => {
        setVideoEvidence(data.videoURL);
        setVideoGps(data.gps);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isEvidenceProvided = issueToEdit ? (evidenceList.length > 0 || videoEvidence) : (evidenceList.length > 0 && videoEvidence);
        if (!isEvidenceProvided) {
            alert('Please capture at least one photo and a video as evidence.');
            return;
        }
        setIsSubmitting(true);

        let finalGpsData = evidenceList.find(e => e.gps)?.gps || videoGps || (issueToEdit ? { lat: issueToEdit.location.lat, lng: issueToEdit.location.lng } : null);

        // If it's a NEW report and we still have no GPS, try a low-accuracy fallback.
        if (!issueToEdit && !finalGpsData && navigator.geolocation) {
             try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false, // Use low accuracy to increase success chance
                        timeout: 8000,
                    });
                });
                finalGpsData = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
            } catch (err) {
                console.warn("Final GPS fallback failed:", err);
                // Proceed without GPS. The user has likely been notified during media capture.
            }
        }

        const formData = {
            title,
            category,
            issueDescription: description,
            urgencyLevel: urgency,
            district,
            panchayat,
            village,
            street,
            _photos: evidenceList.length > 0 ? evidenceList.map(e => e.photo) : issueToEdit?.images || [],
            imageAnalyses: evidenceList.map(e => e.analysis).filter((a): a is AnalysisStatus => a !== 'pending' && !!a),
            _gps: finalGpsData,
            _audioURL: audioEvidence?.dataURL,
            _videoURL: videoEvidence,
        };
        
        await onSubmit(formData);
        setIsSubmitting(false);
    };
    
    const AnalysisBadge: React.FC<{ analysis?: AnalysisStatus | 'pending' }> = ({ analysis }) => {
      if (!analysis) return null;
      const wrapperClasses = "absolute bottom-1 right-1 bg-black/50 rounded-full p-1 text-white flex items-center justify-center";

      if (analysis === 'pending') {
          return (
              <div className={wrapperClasses} title={T.verifying}>
                  <SpinnerIcon />
              </div>
          );
      }
      
      const { status, confidence, reasoning } = analysis;
      const titleText = `${status} (Confidence: ${(confidence * 100).toFixed(0)}%) - ${reasoning}`;
      
      switch (status) {
          case 'Authentic': return <div className={wrapperClasses} title={titleText}><CheckCircleIcon className="w-5 h-5 text-green-400" /></div>;
          case 'Manipulated': return <div className={wrapperClasses} title={titleText}><ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" /></div>;
          case 'AI-Generated': return <div className={wrapperClasses} title={titleText}><RobotIcon className="w-5 h-5 text-red-400" /></div>;
          default: return null;
      }
    };
    
    const renderContent = () => {
        if (step === 0) { // Language selection
            return (
              <div className="text-center p-8">
                <p className="mb-6">{T.welcome_manual}</p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => { setLanguage('en'); setStep(1); }} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">English</button>
                  <button onClick={() => { setLanguage('ta'); setStep(1); }} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">தமிழ்</button>
                  <button onClick={() => { setLanguage('hi'); setStep(1); }} className="px-6 py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-500 hover:text-white transition">हिन्दी</button>
                </div>
              </div>
            );
        }

        if (step === 1) { // Form details
            return (
             <form onSubmit={handleNextStep} className="space-y-8 p-4 animate-fade-in">
                <FormSection title={T.locationDetails}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <SelectField label={T.district} id="district" value={district} onChange={e => setDistrict(e.target.value)}>
                            {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </SelectField>
                        <SelectField label={T.panchayat} id="panchayat" value={panchayat} onChange={e => setPanchayat(e.target.value)}>
                             {panchayats.length > 0 ? panchayats.map(p => <option key={p} value={p}>{p}</option>) : <option>{T.notApplicable}</option>}
                        </SelectField>
                        <SelectField label={T.village} id="village" value={village} onChange={e => setVillage(e.target.value)}>
                             {villages.length > 0 ? villages.map(v => <option key={v} value={v}>{v}</option>) : <option>{T.notApplicable}</option>}
                        </SelectField>
                        <InputField label={T.streetLocality} id="street" value={street} onChange={e => setStreet(e.target.value)} placeholder={T.egMainStreet} required />
                         <div className="sm:col-span-2">
                             <InputField label={T.landmarkOptional} id="landmark" value={landmark} onChange={e => setLandmark(e.target.value)} placeholder={T.egOldTemple}/>
                         </div>
                    </div>
                </FormSection>

                 <FormSection title={T.issueDetails}>
                    <div className="mb-4">
                        <InputField label={T.issueTitle} id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder={T.issueTitlePlaceholder} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <SelectField label={T.categoryIssueType} id="category" value={category} onChange={e => setCategory(e.target.value)}>
                            {['Roads', 'Waste', 'Water', 'Electricity', 'Public Infrastructure', 'Other'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </SelectField>
                        <SelectField label={T.urgencyLevel} id="urgency" value={urgency} onChange={e => setUrgency(e.target.value as any)}>
                            <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                        </SelectField>
                    </div>
                    <div className="mt-4">
                         <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{T.describeIssue}</label>
                         <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={5} className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" placeholder={T.describeIssuePlaceholder} required></textarea>
                    </div>
                 </FormSection>
                 
                <div className="mt-6 flex justify-end">
                    <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">{issueToEdit ? T.nextUpdateEvidence : T.nextAddEvidence}</button>
                </div>
            </form>
            );
        }

        if (step === 2) { // Evidence
            return (
                 <div className="p-4 space-y-6 animate-fade-in">
                    {issueToEdit && issueToEdit.images.length > 0 && (
                        <FormSection title={T.currentPhotos} description={T.currentPhotosNote}>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {issueToEdit.images.map((img, index) => (
                                    <div key={index} className="relative group">
                                        <img src={img} alt={`Current Evidence ${index + 1}`} className="rounded-lg object-cover w-full h-24"/>
                                    </div>
                                ))}
                            </div>
                        </FormSection>
                    )}

                    <FormSection title={T.evidenceTitle} description={T.evidenceDescription.replace('{0}', String(evidenceList.length))}>
                         <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            {evidenceList.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    {evidenceList.map((evidence, index) => (
                                        <div key={index} className="relative group">
                                            <img src={evidence.photo} alt={`Evidence ${index + 1}`} className="rounded-lg object-cover w-full h-24 cursor-pointer" onClick={() => setSelectedPhoto(evidence.photo)}/>
                                            <AnalysisBadge analysis={evidence.analysis} />
                                            <button type="button" onClick={() => removeEvidence(index)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove photo">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {evidenceList.length < 3 ? <CameraCapture onCapture={handleEvidenceCapture} district={district} panchayat={panchayat} village={village} /> : <p className="text-center text-green-600 dark:text-green-400 font-semibold">{T.maxPhotos}</p>}
                         </div>
                    </FormSection>

                    <FormSection title={T.truthDetectorTitle} description={T.truthDetectorDescription} />
                    
                     <FormSection title="Record Video (Required)" description="A 30-second video of the issue is required. The recording will stop automatically after 30 seconds.">
                        <VideoRecorder
                            onVideoChange={handleVideoDataChange}
                            currentVideoUrl={videoEvidence}
                            district={district}
                            panchayat={panchayat}
                            village={village}
                        />
                    </FormSection>

                    <FormSection title={T.emotionTitle} description={T.emotionDescription}>
                        <EmotionRecorder onRecordComplete={setAudioEvidence} />
                    </FormSection>
                    
                    <div className="mt-8 flex justify-between items-center">
                        <button type="button" onClick={() => setStep(1)} className="text-gray-600 dark:text-gray-300 hover:underline">Back to Details</button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full sm:w-auto px-6 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                            disabled={isSubmitting || !allAnalysesDone}
                        >
                            {isSubmitting ? T.processing : (issueToEdit ? T.updateReport : T.submitReport)}
                        </button>
                    </div>
                     {selectedPhoto && (
                      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhoto(null)}>
                          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                               <img src={selectedPhoto} alt="Evidence preview" className="rounded-lg object-contain w-full h-full" />
                               <button onClick={() => setSelectedPhoto(null)} className="absolute -top-2 -right-2 bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-xl shadow-lg">&times;</button>
                          </div>
                      </div>
                  )}
                </div>
            );
        }
    };
    
    return (
        <div className="flex h-full max-h-[85vh] flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <button onClick={step === 2 ? () => setStep(1) : onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline">
              <ChevronLeftIcon />
              Back
            </button>
             <h2 className="text-xl font-bold text-center flex-1 text-gray-900 dark:text-white">{issueToEdit ? T.editReportTitle : T.newReportTitle}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {renderContent()}
          </div>
        </div>
    );
};

export default ReportFormView;