import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from './useTranslation';

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const { language } = useTranslation();

  useEffect(() => {
    if ('speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  // Function to find the best voice for the current language
  const getVoice = useCallback(() => {
    if (!supported) return null;
    let voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const langCode = language === 'pa' ? 'pa-IN' : 'en-US'; 
    const langCodeShort = language === 'pa' ? 'pa' : 'en';

    // Prioritize voices: 1. Exact match (pa-IN), 2. Language match (pa), 3. English as fallback
    let voice = voices.find(v => v.lang === langCode);
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith(langCodeShort));
    }
    if(!voice && language === 'pa'){ // Fallback for Punjabi if no specific voice is found
        voice = voices.find(v => v.lang.startsWith('en'));
    }
    
    return voice || voices[0];
  }, [language, supported]);


  const speak = useCallback((text: string) => {
    if (!supported || isSpeaking) return;

    // Clean up HTML tags from content for speech
    const strippedText = text.replace(/<[^>]+>/g, '');
    const utterance = new SpeechSynthesisUtterance(strippedText);
    
    const setVoiceOnUtterance = () => {
        const voice = getVoice();
        if(voice) {
            utterance.voice = voice;
        }
    };
    
    // Voices may load asynchronously.
    if (window.speechSynthesis.getVoices().length > 0) {
        setVoiceOnUtterance();
    } else {
        window.speechSynthesis.onvoiceschanged = setVoiceOnUtterance;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    // Cancel any previous speech before starting new
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

  }, [supported, isSpeaking, getVoice]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);
  
  // Cleanup on unmount: ensure speech stops if user navigates away
  useEffect(() => {
      return () => {
          if (supported) {
              window.speechSynthesis.cancel();
          }
      }
  }, [supported]);

  return { speak, cancel, isSpeaking, supported };
};