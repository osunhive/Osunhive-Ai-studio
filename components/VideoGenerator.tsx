import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { AspectRatio, Resolution, GenerationStatus, TaskMode, ImageSize } from '../types';
import LoadingState from './LoadingState';
import VideoPlayer from './VideoPlayer';

const OsunhiveLogo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" fill="#F97316" />
    <path d="M50 35L70 50L50 65L30 50L50 35Z" fill="white" />
    <path d="M50 50L70 65L50 80L30 65L50 50Z" fill="white" fillOpacity="0.8" />
  </svg>
);

// --- Adsterra / Monetag Ad Component ---
const AdSlot: React.FC<{ placement: 'sidebar' | 'content' | 'bottom' }> = ({ placement }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // This effect simulates script execution if you were to inject ad tags dynamically
  useEffect(() => {
    if (containerRef.current) {
      // For real ads, you would normally paste the script provided by Adsterra/Monetag
      // Example: 
      // const script = document.createElement('script');
      // script.src = '...';
      // containerRef.current.appendChild(script);
    }
  }, [placement]);

  const height = placement === 'sidebar' ? 'min-h-[250px]' : 'min-h-[90px]';

  return (
    <div className={`ad-slot-wrapper ${height} w-full`}>
      <span className="ad-label">Advertisement</span>
      <div className="flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
        <i className="fas fa-rectangle-ad text-2xl mb-1 text-orange-400/50"></i>
        <span className="text-[9px] font-mono text-gray-600 uppercase">Adsterra / Monetag Slot</span>
        {/* Real Ad Code would go inside dangerouslySetInnerHTML or appended via DOM */}
        {/* <div dangerouslySetInnerHTML={{ __html: '<!-- PASTE AD TAG HERE -->' }} /> */}
      </div>
    </div>
  );
};

const DEFAULT_PROMPTS = {
  VIDEO: "How people can make money online in 2026. Futuristic digital visuals.",
  IMAGE: "A futuristic digital workspace in 2026, glowing holograms, neon lighting.",
  TEXT: "Explain the top 5 emerging side hustles in the AI economy of 2026.",
  CODE: "Write a high-performance React component for a real-time AI dashboard using Tailwind CSS.",
  SPEECH: "Welcome to osunhive.name.ng. Today we are exploring the frontiers of artificial intelligence.",
  LIVE: "You are a helpful and friendly AI assistant from osunhive.name.ng."
};

const DIALOGUE_TEMPLATE = `[
  {"speaker": "Joe", "text": "Hey Jane, did you see the new Osunhive studio update?"},
  {"speaker": "Jane", "text": "Yes Joe! The multi-speaker support is incredible for creators."}
]`;

const VISUAL_STYLES = [
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'anime', label: 'Anime / Manga' },
  { id: 'cartoonish', label: 'Cartoonish / 3D Render' },
  { id: 'cyberpunk', label: 'Cyberpunk / Neon' },
  { id: 'realistic', label: 'Photorealistic' },
  { id: 'abstract', label: 'Abstract / Artistic' }
];

const VOICES = [
  { name: 'Zephyr', label: 'Zephyr (Female / Soft)' },
  { name: 'Kore', label: 'Kore (Male / Balanced)' },
  { name: 'Puck', label: 'Puck (Male / Deep)' },
  { name: 'Charon', label: 'Charon (Male / Grave)' },
  { name: 'Fenrir', label: 'Fenrir (Male / Strong)' }
];

// --- Audio Utilities ---
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function audioBufferToWav(buffer: AudioBuffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferWav = new ArrayBuffer(length);
  const view = new DataView(bufferWav);
  let pos = 0;
  const setUint32 = (d: number) => { view.setUint32(pos, d, true); pos += 4; };
  const setUint16 = (d: number) => { view.setUint16(pos, d, true); pos += 2; };
  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);
  for (let i = 0; i < buffer.length; i++) {
    for (let chan = 0; chan < numOfChan; chan++) {
      let s = Math.max(-1, Math.min(1, buffer.getChannelData(chan)[i]));
      view.setInt16(pos, (s < 0 ? s * 0x8000 : s * 0x7fff) | 0, true);
      pos += 2;
    }
  }
  return new Blob([bufferWav], { type: 'audio/wav' });
}

interface Props {
  onKeyError?: () => void;
}

const VideoGenerator: React.FC<Props> = ({ onKeyError }) => {
  const [taskMode, setTaskMode] = useState<TaskMode>('VIDEO');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPTS.VIDEO);
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0].id);
  
  const [selectedModel, setSelectedModel] = useState<string>('veo-3.1-fast-generate-preview');
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  
  const [systemInstruction, setSystemInstruction] = useState("You are an expert developer and AI specialist.");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  
  // Multi Speaker States
  const [isMultiSpeaker, setIsMultiSpeaker] = useState(false);
  const [speaker1, setSpeaker1] = useState({ name: 'Joe', voice: 'Kore' });
  const [speaker2, setSpeaker2] = useState({ name: 'Jane', voice: 'Zephyr' });
  const [voiceName, setVoiceName] = useState(VOICES[0].name);
  
  const [thinkingBudget, setThinkingBudget] = useState<number>(0);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(4096);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPushed, setIsPushed] = useState(false);
  const [hasVisitedSite, setHasVisitedSite] = useState(false);
  
  const [status, setStatus] = useState<GenerationStatus>({
    isGenerating: false,
    message: "",
    progress: 0
  });

  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  }, []);

  useEffect(() => {
    setPrompt(DEFAULT_PROMPTS[taskMode]);
    setIsCustomModel(false);
    if (taskMode === 'VIDEO') setSelectedModel('veo-3.1-fast-generate-preview');
    else if (taskMode === 'IMAGE') setSelectedModel('gemini-2.5-flash-image');
    else if (taskMode === 'SPEECH') setSelectedModel('gemini-2.5-flash-preview-tts');
    else if (taskMode === 'LIVE') setSelectedModel('gemini-2.5-flash-native-audio-preview-09-2025');
    else if (taskMode === 'CODE') setSelectedModel('gemini-3-pro-preview');
    else setSelectedModel('gemini-3-flash-preview');
    
    setVideoUrl(null);
    setGeneratedImageUrl(null);
    setTextResult(null);
    setAudioUrl(null);
    stopLiveSession();
  }, [taskMode]);

  const stopLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    setIsLiveActive(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const getActiveModel = () => isCustomModel ? customModelName : selectedModel;

  const constructPrompt = () => {
    if (['VIDEO', 'IMAGE'].includes(taskMode)) {
      const styleLabel = VISUAL_STYLES.find(s => s.id === visualStyle)?.label;
      return `[Style: ${styleLabel}] ${prompt}`;
    }
    if (taskMode === 'SPEECH' && isMultiSpeaker) {
        try {
            const data = JSON.parse(prompt);
            if (Array.isArray(data)) {
                return `TTS the following conversation between ${speaker1.name} and ${speaker2.name}:\n` + 
                       data.map(line => `${line.speaker}: ${line.text}`).join('\n');
            }
        } catch (e) {
            return `TTS the following conversation between ${speaker1.name} and ${speaker2.name}:\n${prompt}`;
        }
    }
    return prompt;
  };

  const generateContent = async () => {
    if (!hasVisitedSite) {
      alert("Verification: Visit osunhive.name.ng to unlock studio features.");
      window.open('https://osunhive.name.ng', '_blank');
      setHasVisitedSite(true);
      return;
    }

    if (taskMode === 'LIVE') {
      handleLiveSession();
      return;
    }

    const modelToUse = getActiveModel();
    setStatus({ isGenerating: true, message: `Starting ${taskMode.toLowerCase()} engine...`, progress: 5 });
    setVideoUrl(null);
    setGeneratedImageUrl(null);
    setTextResult(null);
    setAudioUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (taskMode === 'VIDEO') await handleVideoGeneration(ai, modelToUse);
      else if (taskMode === 'IMAGE') await handleImageGeneration(ai, modelToUse);
      else if (taskMode === 'SPEECH') await handleSpeechGeneration(ai, modelToUse);
      else if (taskMode === 'CODE') await handleCodeGeneration(ai, modelToUse);
      else await handleTextGeneration(ai, modelToUse);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found.")) onKeyError?.();
      setStatus({ isGenerating: false, message: `Error: ${error.message}`, progress: 0 });
    }
  };

  const handleLiveSession = async () => {
    if (isLiveActive) { stopLiveSession(); return; }
    try {
      setIsLiveActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: getActiveModel(),
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          systemInstruction: constructPrompt(),
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => console.error("Live Error:", e)
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsLiveActive(false);
      alert("Live audio failed. Check microphone permissions.");
    }
  };

  const handleSpeechGeneration = async (ai: any, modelName: string) => {
    setStatus({ isGenerating: true, message: "Synthesizing Multimodal Audio...", progress: 30 });
    const config: any = { responseModalities: [Modality.AUDIO] };

    if (isMultiSpeaker) {
        config.speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                    { speaker: speaker1.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker1.voice } } },
                    { speaker: speaker2.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker2.voice } } }
                ]
            }
        };
    } else {
        config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName } } };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: constructPrompt() }] }],
      config
    });

    const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64) {
      const ctx = new AudioContext({ sampleRate: 24000 });
      const buffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      setAudioUrl(URL.createObjectURL(audioBufferToWav(buffer)));
      setStatus({ isGenerating: false, message: "", progress: 100 });
    }
  };

  const handleVideoGeneration = async (ai: any, modelName: string) => {
    const p = constructPrompt();
    const config: any = {
      model: modelName, prompt: p,
      config: { numberOfVideos: 1, resolution, aspectRatio }
    };
    if (uploadedImage) {
      config.image = { imageBytes: await fileToBase64(uploadedImage), mimeType: uploadedImage.type };
    }
    let operation = await ai.models.generateVideos(config);
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
      setStatus(s => ({ ...s, progress: Math.min(s.progress + 5, 95), message: "Synthesizing high-res pixels..." }));
    }
    const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
    const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
    setVideoUrl(URL.createObjectURL(await res.blob()));
    setStatus({ isGenerating: false, message: "", progress: 100 });
  };

  const handleImageGeneration = async (ai: any, modelName: string) => {
    const parts: any[] = [{ text: constructPrompt() }];
    if (uploadedImage) {
      parts.push({ inlineData: { data: await fileToBase64(uploadedImage), mimeType: uploadedImage.type } });
    }
    const config: any = {
      model: modelName, contents: { parts },
      config: { systemInstruction, imageConfig: { aspectRatio, imageSize: modelName.includes('pro') ? imageSize : undefined } }
    };
    if (thinkingBudget > 0) config.config.thinkingConfig = { thinkingBudget };
    const response = await ai.models.generateContent(config);
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) setGeneratedImageUrl(`data:image/png;base64,${part.inlineData.data}`);
    }
    setStatus({ isGenerating: false, message: "", progress: 100 });
  };

  const handleTextGeneration = async (ai: any, modelName: string) => {
    const parts: any[] = [{ text: constructPrompt() }];
    if (uploadedImage) {
      parts.push({ inlineData: { data: await fileToBase64(uploadedImage), mimeType: uploadedImage.type } });
    }
    const config: any = { model: modelName, contents: { parts }, config: { maxOutputTokens, systemInstruction } };
    if (thinkingBudget > 0) config.config.thinkingConfig = { thinkingBudget };
    const response = await ai.models.generateContent(config);
    setTextResult(response.text || "No response received.");
    setStatus({ isGenerating: false, message: "", progress: 100 });
  };

  const handleCodeGeneration = async (ai: any, modelName: string) => {
    const parts: any[] = [{ text: constructPrompt() }];
    if (uploadedImage) {
      parts.push({ inlineData: { data: await fileToBase64(uploadedImage), mimeType: uploadedImage.type } });
    }
    const config: any = { 
      model: modelName, 
      contents: { parts }, 
      config: { 
        maxOutputTokens: 65536, 
        systemInstruction: "You are a senior lead engineer. Write clean code with minimal explanation.",
        thinkingConfig: { thinkingBudget: 32768 }
      } 
    };
    const response = await ai.models.generateContent(config);
    setTextResult(response.text || "Failed to generate code.");
    setStatus({ isGenerating: false, message: "", progress: 100 });
  };

  const copyToClipboard = () => {
    if (textResult) {
      navigator.clipboard.writeText(textResult);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const pushToGit = () => {
    if (textResult) {
      const blob = new Blob([textResult], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `osunhive-export-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setIsPushed(true);
      setTimeout(() => setIsPushed(false), 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen bg-gray-950 overflow-hidden">
      <div className="w-full md:w-96 glass-panel p-6 border-r border-white/5 flex flex-col overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
           <OsunhiveLogo />
           <h2 className="text-xl font-bold font-display text-orange-500">osunhive.name.ng</h2>
        </div>
        
        <div className="flex p-1 bg-gray-900 rounded-xl mb-6 flex-wrap gap-1">
          {(['VIDEO', 'IMAGE', 'TEXT', 'CODE', 'SPEECH', 'LIVE'] as TaskMode[]).map(mode => (
            <button key={mode} onClick={() => setTaskMode(mode)}
              className={`flex-1 min-w-[30%] py-2 text-[10px] font-bold rounded-lg transition-all ${taskMode === mode ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
              {mode}
            </button>
          ))}
        </div>

        <div className="space-y-6 flex-1">
          <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 rounded-xl p-4 border border-orange-500/20 shadow-lg">
             <div className="flex items-center gap-3 mb-3">
                <i className="fab fa-telegram text-orange-400 text-lg"></i>
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Connect With Us</span>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <a href="https://t.me/Osunhive" target="_blank" rel="noreferrer" className="py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-center text-[9px] font-black uppercase text-white transition-all shadow-xl shadow-orange-500/10">Telegram</a>
                <a href="https://wa.me/2349076129380" target="_blank" rel="noreferrer" className="py-2 bg-green-600 hover:bg-green-500 rounded-lg text-center text-[9px] font-black uppercase text-white transition-all shadow-xl shadow-green-500/10">WhatsApp</a>
                <a href="https://youtube.com/@osunhiveofficial" target="_blank" rel="noreferrer" className="py-2 bg-red-600 hover:bg-red-500 rounded-lg text-center text-[9px] font-black uppercase text-white transition-all shadow-xl shadow-red-500/10 col-span-2">YouTube</a>
             </div>
          </div>

          <AdSlot placement="sidebar" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">Engine / Tier</label>
              <select value={isCustomModel ? 'custom' : selectedModel} onChange={(e) => {
                if (e.target.value === 'custom') setIsCustomModel(true);
                else { setIsCustomModel(false); setSelectedModel(e.target.value); }
              }} className="w-full bg-gray-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none">
                {taskMode === 'VIDEO' ? (<><option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</option><option value="veo-3.1-generate-preview">Veo 3.1 HQ</option></>) :
                 taskMode === 'IMAGE' ? (<><option value="gemini-2.5-flash-image">Gemini Flash Image</option><option value="gemini-3-pro-image-preview">Gemini Pro Image</option></>) :
                 taskMode === 'SPEECH' ? (<option value="gemini-2.5-flash-preview-tts">Gemini 2.5 TTS</option>) :
                 taskMode === 'LIVE' ? (<option value="gemini-2.5-flash-native-audio-preview-09-2025">Gemini 2.5 Live</option>) :
                 taskMode === 'CODE' ? (<option value="gemini-3-pro-preview">Gemini 3 Pro (Coding)</option>) :
                 (<><option value="gemini-3-flash-preview">Gemini 3 Flash</option><option value="gemini-3-pro-preview">Gemini 3 Pro</option></>)}
              </select>
            </div>

            {taskMode === 'SPEECH' && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Multi-Speaker</span>
                  <button onClick={() => setIsMultiSpeaker(!isMultiSpeaker)} className={`w-10 h-5 rounded-full relative transition-all ${isMultiSpeaker ? 'bg-orange-600' : 'bg-gray-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isMultiSpeaker ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
                {isMultiSpeaker && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <input value={speaker1.name} onChange={e => setSpeaker1({...speaker1, name: e.target.value})} className="w-full bg-black border border-white/5 rounded p-2 text-[10px] text-white" placeholder="S1 Name" />
                        <select value={speaker1.voice} onChange={e => setSpeaker1({...speaker1, voice: e.target.voice})} className="w-full bg-black border border-white/5 rounded p-2 text-[10px] text-gray-400">
                          {VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <input value={speaker2.name} onChange={e => setSpeaker2({...speaker2, name: e.target.value})} className="w-full bg-black border border-white/5 rounded p-2 text-[10px] text-white" placeholder="S2 Name" />
                        <select value={speaker2.voice} onChange={e => setSpeaker2({...speaker2, voice: e.target.voice})} className="w-full bg-black border border-white/5 rounded p-2 text-[10px] text-gray-400">
                          {VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => setPrompt(DIALOGUE_TEMPLATE)} className="w-full py-1 text-[9px] text-orange-400 border border-orange-400/20 rounded">Load Dialogue JSON</button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-gray-500 mb-2 uppercase tracking-widest">Prompt / Script</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-gray-900 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none font-mono" />
            </div>
          </div>

          <button onClick={generateContent} disabled={status.isGenerating}
            className={`w-full py-4 rounded-2xl font-bold transition-all shadow-xl ${
              status.isGenerating ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20'
            }`}>
            {status.isGenerating ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-play-circle mr-2"></i>}
            {status.isGenerating ? status.message : 'Execute Generator'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-black flex flex-col items-center justify-center p-8 overflow-y-auto relative">
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl">
          {status.isGenerating ? <LoadingState status={status} /> :
           videoUrl ? <VideoPlayer url={videoUrl} aspectRatio={aspectRatio} /> :
           generatedImageUrl ? (
             <div className="text-center">
               <img src={generatedImageUrl} className="rounded-3xl shadow-2xl border border-white/10 mx-auto max-h-[70vh]" alt="AI Gen" />
               <div className="mt-4 flex gap-4 justify-center">
                  <a href={generatedImageUrl} download="osunhive-art.png" className="px-6 py-3 bg-white/10 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-white/20"><i className="fas fa-download"></i> Export Art</a>
               </div>
             </div>
           ) : textResult ? (
             <div className="w-full bg-gray-900/50 p-10 rounded-3xl border border-white/5 relative group">
                <div className="absolute top-4 right-4 flex gap-2">
                   <button onClick={copyToClipboard} className="px-3 py-1.5 bg-orange-600 rounded text-[10px] font-bold text-white hover:bg-orange-500"><i className={`fas ${isCopied ? 'fa-check' : 'fa-copy'}`}></i> {isCopied ? 'Copied' : 'Copy'}</button>
                   {taskMode === 'CODE' && <button onClick={pushToGit} className="px-3 py-1.5 bg-blue-600 rounded text-[10px] font-bold text-white hover:bg-blue-500"><i className="fas fa-file-code"></i> Git Export</button>}
                </div>
                <div className="font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">{textResult}</div>
             </div>
           ) : audioUrl ? (
             <div className="w-full max-w-md bg-gray-900 p-10 rounded-3xl text-center border border-white/5">
                <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6"><i className="fas fa-waveform-lines text-orange-400 text-2xl"></i></div>
                <audio src={audioUrl} controls className="w-full mb-6" autoPlay />
                <a href={audioUrl} download="osunhive-speech.wav" className="w-full py-3 bg-orange-600 rounded-xl font-bold text-white block hover:bg-orange-500 transition-all uppercase tracking-widest text-xs">Download Studio Master</a>
             </div>
           ) : (
             <div className="text-center opacity-20 flex flex-col items-center">
                <OsunhiveLogo />
                <p className="text-2xl font-display uppercase tracking-widest font-black mt-4">Multimodal Engine Idle</p>
             </div>
           )}

          {!status.isGenerating && (videoUrl || generatedImageUrl || textResult || audioUrl) && (
            <div className="w-full mt-10">
               <AdSlot placement="content" />
            </div>
          )}
        </div>

        <div className="mt-10 w-full max-w-4xl">
           <AdSlot placement="bottom" />
           <div className="flex items-center justify-between mt-4 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
              <span>osunhive.name.ng Multimodal Studio</span>
              <span>© 2026 Olajide Sherif Oyinlola</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;