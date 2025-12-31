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

// --- Combined Ad Component (Adsterra + Monetag) ---
const AdSlot: React.FC<{ placement: 'sidebar' | 'content' | 'bottom' }> = ({ placement }) => {
  const adsterraRef = useRef<HTMLDivElement>(null);
  const monetagRef = useRef<HTMLDivElement>(null);

  // 1. Handle Adsterra Banner (Iframe Isolation)
  useEffect(() => {
    const container = adsterraRef.current;
    if (!container) return;

    container.innerHTML = ''; // Clean up

    const iframe = document.createElement('iframe');
    iframe.width = '320';
    iframe.height = '50';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    
    container.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:0;background:transparent;display:flex;justify-content:center;align-items:center;">
            <script type="text/javascript">
              atOptions = {
                'key' : '299043bf63ee6bdd55f973b56fc2b9f1',
                'format' : 'iframe',
                'height' : 50,
                'width' : 320,
                'params' : {}
              };
            </script>
            <script type="text/javascript" src="https://www.highperformanceformat.com/299043bf63ee6bdd55f973b56fc2b9f1/invoke.js"></script>
          </body>
        </html>
      `);
      doc.close();
    }
  }, [placement]);

  // 2. Handle Monetag (Sidebar Only to prevent duplication)
  useEffect(() => {
    if (placement === 'sidebar' && monetagRef.current) {
        // Clear previous to avoid duplicates on re-render
        monetagRef.current.innerHTML = '';
        
        const script = document.createElement('script');
        script.src = "https://quge5.com/88/tag.min.js";
        script.async = true;
        script.setAttribute('data-zone', '184683');
        script.setAttribute('data-cfasync', 'false');
        
        monetagRef.current.appendChild(script);
    }
  }, [placement]);

  return (
    <div className="w-full flex flex-col items-center justify-center my-4 gap-2">
      <span className="text-[9px] text-gray-600 uppercase tracking-widest">Sponsored Ad</span>
      
      {/* Adsterra Slot (Visible Banner) */}
      <div 
        ref={adsterraRef} 
        className="w-[320px] h-[50px] bg-white/5 rounded border border-white/5 shadow-lg overflow-hidden"
      />

      {/* Monetag Slot (Invisible/Multi-tag - Loaded only in Sidebar) */}
      {placement === 'sidebar' && (
        <div ref={monetagRef} className="hidden" /> // Hidden container for the script to live in
      )}
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
      config: { 
        systemInstruction, 
        imageConfig: { aspectRatio, imageSize: modelName.includes('pro') ? imageSize : undefined },
        thinkingConfig: { thinkingBudget: thinkingBudget || 0 }
      }
    };
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
    const config: any = { 
      model: modelName, 
      contents: { parts }, 
      config: { 
        maxOutputTokens, 
        systemInstruction,
        thinkingConfig: { thinkingBudget: thinkingBudget || 0 }
      } 
    };
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
        
        {/* === AD SLOT: SIDEBAR TOP (Adsterra Visible + Monetag Script) === */}
        <AdSlot placement="sidebar" />

        <div className="mb-6">
           <label className="text-xs font-semibold text-gray-400 mb-2 block">Task Mode</label>
           <div className="grid grid-cols-3 gap-2">
             {['VIDEO', 'IMAGE', 'TEXT', 'CODE', 'SPEECH', 'LIVE'].map((m) => (
               <button
                 key={m}
                 onClick={() => setTaskMode(m as TaskMode)}
                 className={`px-3 py-2 text-xs font-bold rounded-md transition-all ${
                   taskMode === m 
                   ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                   : 'bg-white/5 text-gray-400 hover:bg-white/10'
                 }`}
               >
                 {m}
               </button>
             ))}
           </div>
        </div>

        {/* Example: Prompt Input */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-gray-400 mb-2 block">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none"
          />
        </div>

        {/* === AD SLOT: SIDEBAR BOTTOM (Adsterra Visible only) === */}
        <div className="mt-auto">
             <AdSlot placement="sidebar" />
             <button
                onClick={generateContent}
                disabled={status.isGenerating}
                className={`w-full py-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                    status.isGenerating 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : isLiveActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/20'
                }`}
                >
                {status.isGenerating ? 'Processing...' : isLiveActive ? 'End Live Session' : 'Generate'}
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
          {/* === AD SLOT: CONTENT TOP === */}
          <div className="px-6 pt-4">
            <AdSlot placement="content" />
          </div>
          
          <div className="flex-1 flex items-center justify-center p-6">
              {status.isGenerating ? (
                  <LoadingState message={status.message} progress={status.progress} />
              ) : videoUrl ? (
                  <VideoPlayer url={videoUrl} />
              ) : generatedImageUrl ? (
                  <img src={generatedImageUrl} alt="Generated" className="max-h-[80vh] rounded-lg shadow-2xl" />
              ) : textResult ? (
                  <div className="w-full max-w-4xl glass-panel p-6 rounded-xl border border-white/10 relative group">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={copyToClipboard} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white/70">
                           {isCopied ? "Copied" : "Copy"}
                        </button>
                        <button onClick={pushToGit} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white/70">
                           {isPushed ? "Pushed" : "Push"}
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">{textResult}</pre>
                  </div>
              ) : (
                  <div className="text-center opacity-30">
                      <div className="w-24 h-24 bg-white/5 rounded-full mx-auto mb-4 flex items-center justify-center">
                          <OsunhiveLogo />
                      </div>
                      <p className="text-gray-400 font-mono text-sm">Select a mode and start creating</p>
                  </div>
              )}
          </div>

          {/* === AD SLOT: BOTTOM === */}
          <div className="px-6 pb-4">
             <AdSlot placement="bottom" />
          </div>
      </div>
    </div>
  );
};

export default VideoGenerator;
