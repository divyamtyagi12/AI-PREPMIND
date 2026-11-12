import React, { useState } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

export default function VoiceAnswerRecorder({ onTranscriptUpdate, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [supported, setSupported] = useState(
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const toggleRecording = () => {
    if (!supported) return;

    if (isRecording) {
      recognitionInstance?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          onTranscriptUpdate?.(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      setRecognitionInstance(recognition);
      setIsRecording(true);
    }
  };

  if (!supported) {
    return (
      <span className="text-[11px] text-slate-400">
        Voice recognition unavailable in this browser. (Use text input)
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleRecording}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
        isRecording
          ? 'bg-rose-500 text-white animate-pulse'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
      }`}
    >
      {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-indigo-500" />}
      <span>{isRecording ? 'Listening (Click to stop)...' : 'Answer with Voice'}</span>
    </button>
  );
}

