
import React, { useState, useEffect } from 'react';
import { 
    XMarkIcon, ChevronRightIcon, SparklesIcon, 
    HeartIcon, BoltIcon, MoonIcon, 
    ShieldCheckIcon, SpeakerWaveIcon
} from './icons';

// --- ASSETS FORNECIDOS ---
const IMG_VISION = "https://i.postimg.cc/28k0FKwD/X_Ring.jpg"; 
const IMG_RING = "https://i.postimg.cc/VLKD7WGz/X_ring.jpg";
const IMG_BAND = "https://i.postimg.cc/L6xNy3C4/X_Band_White.jpg";
const IMG_EARRINGS = "https://i.postimg.cc/02Vct0WR/X_Earrings.jpg";
const IMG_FINAL = "https://i.postimg.cc/rFfQhNnp/1768405061190.png";

interface AppPresentationModalProps {
    onClose: () => void;
}

const AppPresentationModal: React.FC<AppPresentationModalProps> = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showFinalCta, setShowFinalCta] = useState(false);

    // Efeito para revelar o CTA subliminar no último slide
    useEffect(() => {
        if (currentSlide === 4) { // Último slide (Final)
            setShowFinalCta(false);
            const timer = setTimeout(() => setShowFinalCta(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [currentSlide]);

    const slides = [
        {
            id: 'vision',
            overline: "Dr. X Vision",
            title: "Sua saúde em alta definição.",
            subtitle: "Um ecossistema de wearables projetados para desaparecer na sua rotina e aparecer quando você mais precisa.",
            image: IMG_VISION,
            features: [],
            theme: "from-black/90 via-black/40 to-transparent"
        },
        {
            id: 'ring',
            overline: "X Ring",
            title: "A jóia da precisão.",
            subtitle: "O monitor de saúde mais discreto do mundo. Titânio aeroespacial e sensores de nível médico.",
            image: IMG_RING,
            features: [
                { icon: <HeartIcon className="w-5 h-5"/>, label: "ECG Contínuo" },
                { icon: <MoonIcon className="w-5 h-5"/>, label: "Sono Clínico" },
            ],
            theme: "from-zinc-950/95 via-zinc-950/40 to-transparent"
        },
        {
            id: 'band',
            overline: "X Band White",
            title: "Performance pura.",
            subtitle: "Design minimalista com autonomia extrema. O equilíbrio perfeito entre estilo e dados.",
            image: IMG_BAND,
            features: [
                { icon: <BoltIcon className="w-5 h-5"/>, label: "7 Dias de Uso" },
                { icon: <ShieldCheckIcon className="w-5 h-5"/>, label: "IP68 Proteção" },
            ],
            theme: "from-slate-900/95 via-slate-900/40 to-transparent"
        },
        {
            id: 'earrings',
            overline: "X Earrings",
            title: "Invisível por design.",
            subtitle: "Brincos inteligentes que monitoram temperatura e estresse sem que ninguém perceba.",
            image: IMG_EARRINGS,
            features: [
                { icon: <SpeakerWaveIcon className="w-5 h-5"/>, label: "Bio-acústica" },
                { icon: <SparklesIcon className="w-5 h-5"/>, label: "Bio-sensores" },
            ],
            theme: "from-zinc-900/95 via-zinc-950/40 to-transparent"
        },
        {
            id: 'final',
            overline: "Ecossistema Dr. X",
            title: "O futuro, ativado.",
            subtitle: "", 
            image: IMG_FINAL,
            features: [],
            theme: "from-black via-black/80 to-transparent"
        }
    ];

    const handleNext = () => {
        if (isAnimating) return;
        if (currentSlide < slides.length - 1) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentSlide(prev => prev + 1);
                setIsAnimating(false);
            }, 600);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0 && !isAnimating) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentSlide(prev => prev - 1);
                setIsAnimating(false);
            }, 600);
        }
    };

    const activeSlide = slides[currentSlide];
    const isFinalSlide = currentSlide === slides.length - 1;

    return (
        <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col font-sans overflow-hidden select-none">
            
            {/* 1. BACKGROUND IMMERSIVE LAYER */}
            <div className="absolute inset-0 z-0">
                {/* Ken Burns Effect (Slow Zoom) */}
                <div key={activeSlide.id} className="absolute inset-0 animate-[float_15s_ease-in-out_infinite]">
                    <img 
                        src={activeSlide.image} 
                        alt="Product Showcase" 
                        className="w-full h-full object-cover transition-opacity duration-1000 ease-in-out opacity-100"
                        style={{ transform: 'scale(1.15)' }} 
                    />
                </div>
                
                {/* Overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t ${activeSlide.theme} transition-all duration-1000`}></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
            </div>

            {/* 2. TOP INTERFACE */}
            <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-50">
                {/* Progress Indicators */}
                <div className="flex gap-2">
                    {slides.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-0.5 rounded-full transition-all duration-700 ${idx === currentSlide ? 'w-10 bg-white shadow-[0_0_15px_white]' : 'w-4 bg-white/20'}`}
                        />
                    ))}
                </div>
                
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-full border border-white/10 transition-all active:scale-90"
                >
                    <XMarkIcon className="w-5 h-5 text-white/80" />
                </button>
            </div>

            {/* 3. CENTER/BOTTOM CONTENT */}
            <div className="relative z-10 flex-1 flex flex-col justify-end pb-32 px-8 md:px-20 max-w-6xl mx-auto w-full">
                
                <div className={`transition-all duration-1000 transform ${isAnimating ? 'opacity-0 translate-y-12 blur-sm' : 'opacity-100 translate-y-0 blur-0'}`}>
                    
                    <p className="text-teal-400 font-bold uppercase tracking-[0.4em] text-[10px] mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-3 h-3 animate-pulse" />
                        {activeSlide.overline}
                    </p>
                    
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-6 leading-[0.85] drop-shadow-2xl">
                        {activeSlide.title}
                    </h1>
                    
                    {!isFinalSlide && (
                        <p className="text-lg md:text-2xl text-slate-300 font-light max-w-xl leading-relaxed drop-shadow-lg opacity-80 border-l-2 border-teal-500/30 pl-6">
                            {activeSlide.subtitle}
                        </p>
                    )}

                    {/* Quick Features */}
                    {!isFinalSlide && activeSlide.features.length > 0 && (
                        <div className="mt-12 flex gap-4 overflow-x-auto no-scrollbar">
                            {activeSlide.features.map((feat, idx) => (
                                <div key={idx} className="bg-black/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 min-w-[140px] hover:bg-white/5 transition-colors">
                                    <div className="text-teal-400 mb-2">{feat.icon}</div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{feat.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* REFINED SUBLIMINAL CTA - FINAL SLIDE */}
                    {isFinalSlide && (
                        <div className={`mt-4 transition-all duration-1000 ${showFinalCta ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                            <p className="text-xl md:text-2xl text-slate-400 font-light mb-12 max-w-lg leading-relaxed">
                                A jornada para o seu melhor eu começa com um único dado. <span className="text-white font-bold">Inicie a sincronia.</span>
                            </p>
                            
                            <button 
                                onClick={onClose}
                                className="group relative flex items-center gap-6 px-10 py-5 bg-white text-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_50px_rgba(255,255,255,0.4)]"
                            >
                                <span className="text-sm font-black uppercase tracking-[0.2em] relative z-10">Entrar no Sistema</span>
                                <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-2 transition-transform relative z-10" />
                                
                                {/* Subliminal Glow Layer */}
                                <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 via-transparent to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                            
                            <p className="mt-8 text-[10px] text-slate-600 font-mono tracking-widest uppercase">
                                Dr. X Health OS // Stable Access Required
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. NAVIGATION CONTROLS */}
            {!isFinalSlide && (
                <div className="absolute bottom-10 left-0 right-0 px-8 md:px-20 flex justify-between items-center z-50">
                    <button 
                        onClick={handlePrev}
                        className={`text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center gap-2 ${currentSlide === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        <ChevronRightIcon className="w-4 h-4 rotate-180" /> Voltar
                    </button>

                    <button 
                        onClick={handleNext}
                        className="group flex items-center gap-4 text-white"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500">Explorar</span>
                        <div className="w-14 h-14 rounded-full border border-white/20 backdrop-blur-xl flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-300">
                            <ChevronRightIcon className="w-6 h-6" />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppPresentationModal;
