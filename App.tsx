
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GenerationStatus, 
  GeneratedImage, 
  AspectRatio, 
  ImageQuality 
} from './types';
import { generateProductPhoto } from './services/geminiService';

// --- Components ---

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ onClick, disabled, variant = 'primary', children, className = "" }) => {
  const baseStyles = "px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]";
  const variants = {
    primary: "bg-[#7c2d12] text-white hover:bg-[#451a03]",
    secondary: "bg-white text-[#7c2d12] border border-[#7c2d12] hover:bg-[#fff7ed]",
    accent: "bg-[#d97706] text-white hover:bg-[#b45309]"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const FileUpload: React.FC<{ onFileSelect: (file: File) => void, currentImage: string | null }> = ({ onFileSelect, currentImage }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className={`relative w-full aspect-square md:aspect-video rounded-2xl border-2 border-dashed border-[#7c2d12]/30 bg-white/50 hover:bg-white/80 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden group`}
    >
      {currentImage ? (
        <>
          <img src={currentImage} alt="Product preview" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white font-medium">Click to Change Image</span>
          </div>
        </>
      ) : (
        <div className="text-center p-8">
          <svg className="w-12 h-12 mx-auto text-[#7c2d12]/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-[#7c2d12] font-semibold">Upload Product Image</p>
          <p className="text-sm text-[#7c2d12]/60 mt-2">JPEG or PNG, up to 10MB</p>
        </div>
      )}
      <input 
        ref={inputRef}
        type="file" 
        accept="image/*" 
        onChange={handleChange} 
        className="hidden" 
      />
    </div>
  );
};

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center">
    <div className="w-24 h-24 mb-6 relative">
      <div className="absolute inset-0 rounded-full border-4 border-[#7c2d12]/10 border-t-[#d97706] animate-spin"></div>
    </div>
    <h3 className="text-2xl font-bold text-[#7c2d12] mb-2">Crafting Excellence</h3>
    <p className="text-[#7c2d12]/70 animate-pulse">{message}</p>
    <div className="mt-8 flex gap-2">
      <div className="w-2 h-2 rounded-full bg-[#d97706] animate-bounce"></div>
      <div className="w-2 h-2 rounded-full bg-[#d97706] animate-bounce delay-100"></div>
      <div className="w-2 h-2 rounded-full bg-[#d97706] animate-bounce delay-200"></div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [quality, setQuality] = useState<ImageQuality>('Standard (Flash)');
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [currentResult, setCurrentResult] = useState<GeneratedImage | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Check key status on mount
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio?.hasSelectedApiKey();
      setHasKey(!!selected);
    };
    checkKey();
  }, []);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenSelectKey = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
    setHasKey(true);
  };

  const checkProPermissions = async () => {
    if (quality === 'Standard (Flash)') return true;
    
    // @ts-ignore
    const selected = await window.aistudio?.hasSelectedApiKey();
    if (!selected) {
      await handleOpenSelectKey();
      return true;
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    try {
      setStatus(GenerationStatus.GENERATING);
      setErrorMessage(null);

      const canProceed = await checkProPermissions();
      if (!canProceed) {
        setStatus(GenerationStatus.IDLE);
        return;
      }

      const generatedUrl = await generateProductPhoto(
        originalImage, 
        mimeType, 
        userPrompt, 
        aspectRatio,
        quality
      );

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: generatedUrl,
        originalUrl: originalImage,
        prompt: userPrompt || "Default Nigerian Professional Aesthetic",
        timestamp: Date.now()
      };

      setCurrentResult(newImage);
      setGallery(prev => [newImage, ...prev]);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      console.error("Caught error in App:", err);
      if (err.message === 'API_KEY_RESET_REQUIRED') {
        await handleOpenSelectKey();
        setErrorMessage("Access denied (403). Please select a valid API key from a paid GCP project with billing enabled.");
      } else {
        setErrorMessage(err.message || "Something went wrong during generation.");
      }
      setStatus(GenerationStatus.ERROR);
    }
  };

  const loadingMessages = [
    "Infusing traditional patterns...",
    "Adjusting studio lighting...",
    "Applying authentic Nigerian textures...",
    "Rendering high-resolution details...",
    "Curating cultural aesthetics...",
    "Polishing bronze and wood accents..."
  ];

  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  useEffect(() => {
    let interval: any;
    if (status === GenerationStatus.GENERATING) {
      interval = setInterval(() => {
        setActiveMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <div className="ankara-pattern absolute inset-0 pointer-events-none"></div>
      
      <header className="relative z-10 border-b border-[#7c2d12]/10 bg-white/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7c2d12] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">N</div>
          <h1 className="text-2xl font-bold text-[#7c2d12] tracking-tight">NaijaStyle <span className="text-[#d97706] font-normal italic">Studio</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex gap-6 text-[#7c2d12]/60 font-medium text-sm">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="hover:text-[#7c2d12] underline decoration-[#d97706]/30">Billing Setup</a>
          </div>
          <button 
            onClick={handleOpenSelectKey}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${hasKey ? 'border-[#d97706] text-[#d97706]' : 'bg-[#d97706] text-white animate-pulse'}`}
          >
            {hasKey ? "Switch API Key" : "Select Paid API Key"}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        <div className="lg:col-span-5 space-y-8">
          <section>
            <h2 className="text-3xl font-bold text-[#451a03] mb-2">Elevate Your Product</h2>
            <p className="text-[#7c2d12]/70 leading-relaxed">
              Transform standard product shots into premium, culturally authentic Nigerian professional photographs.
            </p>
            {!hasKey && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <div className="text-amber-600 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xs text-amber-800">
                  <p className="font-bold mb-1">Billing Required for Premium Models</p>
                  <p>Please select a paid API key from a GCP project with billing enabled to use Premium and Ultra quality settings.</p>
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl p-6 shadow-xl shadow-orange-900/5 space-y-6">
            <FileUpload onFileSelect={handleFileSelect} currentImage={originalImage} />

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-[#7c2d12]/80 uppercase tracking-wider">Custom Scene Request (Optional)</span>
                <textarea 
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. A modern kitchen setting with minimal Aso-Oke table mats and warm sunrise lighting..."
                  className="mt-1 block w-full rounded-xl border-[#7c2d12]/10 bg-[#faf7f2] focus:border-[#d97706] focus:ring focus:ring-[#d97706]/20 transition-all p-4 min-h-[100px] text-[#451a03]"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-[#7c2d12]/80 uppercase tracking-wider block mb-2">Aspect Ratio</span>
                  <div className="flex flex-wrap gap-2">
                    {(['1:1', '16:9', '9:16', '4:3'] as AspectRatio[]).map((ratio) => (
                      <button 
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${aspectRatio === ratio ? 'bg-[#7c2d12] text-white' : 'bg-[#faf7f2] text-[#7c2d12]/60 hover:bg-[#7c2d12]/5'}`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-semibold text-[#7c2d12]/80 uppercase tracking-wider block mb-2">Quality</span>
                  <select 
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as ImageQuality)}
                    className="w-full bg-[#faf7f2] border-[#7c2d12]/10 rounded-xl text-xs font-bold p-2 focus:ring-[#d97706]/20"
                  >
                    <option value="Standard (Flash)">Standard (Flash)</option>
                    <option value="Premium (Pro 1K)">Premium (Pro 1K)</option>
                    <option value="Ultra (Pro 4K)">Ultra (Pro 4K)</option>
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 animate-shake">
                  {errorMessage}
                </div>
              )}

              <Button 
                onClick={handleGenerate} 
                disabled={!originalImage || status === GenerationStatus.GENERATING}
                className="w-full shadow-lg shadow-[#7c2d12]/20 py-4"
              >
                {status === GenerationStatus.GENERATING ? "Generating Magic..." : "Generate Premium Photo"}
              </Button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-7 space-y-12">
          {status === GenerationStatus.GENERATING ? (
            <div className="w-full aspect-square rounded-[2rem] bg-white/40 flex flex-col items-center justify-center p-12 text-center animate-pulse">
               <div className="w-full h-full border-2 border-dashed border-[#7c2d12]/20 rounded-2xl flex items-center justify-center">
                  <p className="text-[#7c2d12]/40 italic">Wait while we craft your masterpiece...</p>
               </div>
            </div>
          ) : currentResult ? (
            <div className="space-y-6">
              <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl shadow-orange-900/10 group relative overflow-hidden">
                <img 
                  src={currentResult.url} 
                  alt="Generated Result" 
                  className="w-full h-auto rounded-[2rem] object-cover"
                />
                <div className="absolute top-8 right-8 flex gap-2">
                  <a 
                    href={currentResult.url} 
                    download="naija-style-product.png"
                    className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white transition-colors text-[#7c2d12]"
                    title="Download Image"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-between px-2">
                <div>
                  <h3 className="text-xl font-bold text-[#451a03]">Studio Render Success</h3>
                  <p className="text-sm text-[#7c2d12]/60">Created at {new Date(currentResult.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase">Professional</span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">Authentic</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square rounded-[2rem] border-2 border-[#7c2d12]/10 bg-white/40 flex flex-col items-center justify-center p-12 text-center">
              <div className="max-w-xs space-y-4">
                <div className="w-20 h-20 bg-[#fff7ed] rounded-full mx-auto flex items-center justify-center text-[#d97706]">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#7c2d12]">Waiting for Input</h3>
                <p className="text-[#7c2d12]/50">Upload a product photo on the left to see the cultural transformation.</p>
              </div>
            </div>
          )}

          {gallery.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-[#451a03]">Your Studio Gallery</h3>
                <button 
                  onClick={() => { setGallery([]); setCurrentResult(null); }}
                  className="text-sm font-semibold text-[#7c2d12]/40 hover:text-[#7c2d12]"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {gallery.map((img) => (
                  <div 
                    key={img.id} 
                    onClick={() => setCurrentResult(img)}
                    className={`cursor-pointer group relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${currentResult?.id === img.id ? 'border-[#d97706]' : 'border-transparent hover:border-[#7c2d12]/20'}`}
                  >
                    <img src={img.url} alt="Gallery item" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold px-2 py-1 bg-white/20 rounded-full backdrop-blur-md">View Result</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-12 px-6 border-t border-[#7c2d12]/10 text-center">
        <p className="text-[#7c2d12]/60 text-sm">
          © {new Date().getFullYear()} NaijaStyle Product Studio. All rights reserved. <br/>
          Crafting visual excellence through the lens of Nigerian heritage.
        </p>
      </footer>

      {status === GenerationStatus.GENERATING && (
        <LoadingOverlay message={loadingMessages[activeMessageIndex]} />
      )}
    </div>
  );
}
