
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import html2canvas from 'html2canvas';
import { ShareIcon, ArrowPathIcon, MapPinIcon, CameraIcon, SparklesIcon } from './icons';
import { useTranslation } from '../services/i18n';

interface WeatherData {
    temperature: number;
    weathercode: number;
    isDay: boolean;
    minTemp?: number;
    maxTemp?: number;
    windSpeed?: number;
}

const WeatherHero: React.FC = () => {
    const { t } = useTranslation();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiContent, setAiContent] = useState<{phrase: string, goal: string} | null>(null);
    const [locationName, setLocationName] = useState(t('weather.locating'));
    const containerRef = useRef<HTMLDivElement>(null);
    const storyRef = useRef<HTMLDivElement>(null);
    const [sharing, setSharing] = useState(false);

    // Weather Codes Mapping (WMO Code)
    const getWeatherType = (code: number) => {
        if (code === 0) return 'clear';
        if (code >= 1 && code <= 3) return 'cloudy';
        if (code >= 45 && code <= 48) return 'fog';
        if (code >= 51 && code <= 67) return 'rain';
        if (code >= 71 && code <= 77) return 'snow';
        if (code >= 80 && code <= 82) return 'rain';
        if (code >= 95) return 'storm';
        return 'clear';
    };

    const getWeatherTheme = (type: string, isDay: boolean) => {
        // Night Theme
        if (!isDay) return { 
            gradient: 'from-[#0f172a] to-[#1e1b4b]', // Deep dark blue
            groundColor: '#1e293b', // Dark slate ground
            treeColor: '#334155', // Darker silhouette trees
            mascot: '🦉', 
            celestial: 'moon',
            textColor: 'text-white'
        };
        
        switch (type) {
            case 'clear': return { 
                gradient: 'from-[#0ea5e9] to-[#3b82f6]', // Blue Sky
                groundColor: '#10b981', // Green
                treeColor: '#15803d', // Green Trees
                mascot: '🦎',
                celestial: 'sun',
                textColor: 'text-white'
            };
            case 'cloudy': return { 
                gradient: 'from-[#64748b] to-[#475569]', // Grey Sky
                groundColor: '#6b7280', 
                treeColor: '#374151', 
                mascot: '🐢', 
                celestial: 'cloud',
                textColor: 'text-white'
            };
            case 'rain': 
            case 'storm': return { 
                gradient: 'from-[#334155] to-[#1e293b]', // Stormy
                groundColor: '#1e293b', 
                treeColor: '#0f172a', 
                mascot: '🐸', 
                celestial: type === 'storm' ? 'lightning' : 'rain',
                textColor: 'text-white'
            };
            case 'snow': return { 
                gradient: 'from-[#cbd5e1] to-[#94a3b8]', // Cold Grey
                groundColor: '#f1f5f9', // Snow ground
                treeColor: '#64748b', 
                mascot: '🐧', 
                celestial: 'snow',
                textColor: 'text-slate-800'
            };
            default: return { 
                gradient: 'from-blue-500 to-blue-700',
                groundColor: '#10b981',
                treeColor: '#15803d',
                mascot: '🦊',
                celestial: 'sun',
                textColor: 'text-white'
            };
        }
    };

    const getConditionText = (code: number) => {
        const type = getWeatherType(code);
        const map: Record<string, string> = {
            'clear': t('weather.condition.clear'),
            'cloudy': t('weather.condition.cloudy'),
            'fog': t('weather.condition.fog'),
            'rain': t('weather.condition.rain'),
            'snow': t('weather.condition.snow'),
            'storm': t('weather.condition.storm')
        };
        return map[type] || t('weather.condition.normal');
    };

    useEffect(() => {
        const handleLocationError = (err: GeolocationPositionError) => {
            console.warn(`Geo Access Failed: ${err.message} (Code: ${err.code})`);
            setLocationName("Brasil"); // Fallback location name
            setLoading(false);
            
            // Set a pleasant default weather
            const defaultWeather = { 
                temperature: 24, 
                weathercode: 1, // Mainly Clear
                isDay: true, 
                minTemp: 20, 
                maxTemp: 28 
            };
            
            setWeather(defaultWeather); 
            generateAiContent(defaultWeather, "Brasil");
        };

        if (!navigator.geolocation) {
            handleLocationError({ code: 0, message: "Geolocation not supported" } as GeolocationPositionError);
            return;
        }

        const handleSuccess = async (position: GeolocationPosition) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
                const weatherData = await weatherRes.json();
                
                const current = weatherData.current_weather;
                const daily = weatherData.daily;

                const weatherInfo = {
                    temperature: current.temperature,
                    weathercode: current.weathercode,
                    isDay: current.is_day === 1,
                    minTemp: daily.temperature_2m_min[0],
                    maxTemp: daily.temperature_2m_max[0],
                    windSpeed: current.windspeed
                };
                setWeather(weatherInfo);
                
                const tz = weatherData.timezone.split('/')[1]?.replace('_', ' ') || 'Local Atual';
                setLocationName(tz);

                generateAiContent(weatherInfo, tz);

            } catch (e) {
                console.error("Weather API Error:", e);
                setLocationName("Erro na previsão");
                // Fallback to avoid empty state
                const fallback = { temperature: 25, weathercode: 0, isDay: true, minTemp: 20, maxTemp: 28 };
                setWeather(fallback);
                generateAiContent(fallback, "Local");
            } finally {
                setLoading(false);
            }
        };

        navigator.geolocation.getCurrentPosition(handleSuccess, handleLocationError, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000
        });
    }, []);

    const generateAiContent = async (w: WeatherData, location: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const condition = getWeatherType(w.weathercode);
            
            const prompt = `
                Contexto: App de saúde pessoal "Dr. X". Usuário em ${location}.
                Tempo: ${condition}, ${w.temperature}°C.
                Estilo: Conversa casual, direta, como um amigo próximo (chat). SEM frases motivacionais clichês. Use ironia leve ou humor se couber.
                
                Tarefa: Gere um JSON:
                1. "phrase": Frase curta (máx 60 chars) estilo conversa casual.
                2. "goal": Meta de exercício simples (máx 25 chars).
                
                Responda APENAS o JSON.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: prompt }] },
                config: { responseMimeType: "application/json" }
            });

            const text = response.text;
            const json = JSON.parse(text);
            setAiContent(json);
        } catch (e) {
            setAiContent({
                phrase: "Tá um clima bom pra se mexer, bora?",
                goal: "30min de Caminhada"
            });
        }
    };

    const handleShare = async () => {
        if (!storyRef.current) return;
        setSharing(true);

        try {
            await new Promise(r => setTimeout(r, 500));
            const canvas = await html2canvas(storyRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: null, 
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'drx-story.png', { type: 'image/png' });
                if (navigator.share) {
                    await navigator.share({ files: [file] }).catch(console.error);
                } else {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'drx-story.png';
                    a.click();
                }
                setSharing(false);
            });
        } catch (e) {
            console.error(e);
            setSharing(false);
        }
    };

    // --- Vector Tree Component ---
    const VectorTree: React.FC<{ color: string, className?: string, style?: React.CSSProperties }> = ({ color, className, style }) => (
        <svg viewBox="0 0 100 150" className={className} style={style} preserveAspectRatio="none">
            {/* Trunk */}
            <path d="M45,150 L55,150 L55,110 L45,110 Z" fill="#3e2723" fillOpacity="0.5" />
            {/* Foliage */}
            <circle cx="50" cy="90" r="30" fill={color} />
            <circle cx="30" cy="80" r="25" fill={color} />
            <circle cx="70" cy="80" r="25" fill={color} />
            <circle cx="50" cy="50" r="35" fill={color} />
        </svg>
    );

    if (loading) return <div className="h-64 w-full bg-slate-900/50 rounded-3xl animate-pulse mb-6"></div>;
    if (!weather) return null;

    const weatherType = getWeatherType(weather.weathercode);
    const theme = getWeatherTheme(weatherType, weather.isDay);
    const conditionText = getConditionText(weather.weathercode);
    const feelsLike = Math.round(weather.temperature + (weatherType === 'clear' ? 2 : -2));

    // Generate stylistic trees
    const trees = [
        { left: '2%', scale: 0.8, color: theme.treeColor },
        { left: '15%', scale: 1.1, color: theme.treeColor },
        { left: '25%', scale: 0.7, color: theme.treeColor },
        { left: '40%', scale: 0.9, color: theme.treeColor },
        { left: '60%', scale: 1.2, color: theme.treeColor },
        { left: '75%', scale: 0.8, color: theme.treeColor },
        { left: '88%', scale: 1.0, color: theme.treeColor },
    ];

    const SkyIcon = () => {
        if (theme.celestial === 'sun') return <div className="text-yellow-400 text-6xl animate-pulse drop-shadow-lg">☀️</div>;
        if (theme.celestial === 'moon') return <div className="text-yellow-100 text-6xl drop-shadow-lg">🌕</div>;
        if (theme.celestial === 'cloud') return <div className="text-white/80 text-6xl drop-shadow-lg">☁️</div>;
        if (theme.celestial === 'rain') return <div className="text-blue-200 text-6xl drop-shadow-lg">🌧️</div>;
        if (theme.celestial === 'lightning') return <div className="text-yellow-300 text-6xl animate-pulse">⚡</div>;
        return null;
    };

    return (
        <div className="relative mb-2 -mx-4 md:-mx-6 lg:mx-0">
            
            {/* --- MAIN SCENE CONTAINER --- */}
            {/* Mask Image for Fade Out Effect at Bottom */}
            <div 
                ref={containerRef}
                className="relative w-full h-[260px] overflow-hidden"
                style={{ 
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
                }}
            >
                {/* Background Gradient with opacity for blending */}
                <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient} opacity-80`}></div>

                {/* 1. ATMOSPHERE LAYER */}
                {weatherType === 'rain' && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-10 animate-[rain_0.5s_linear_infinite]"></div>}
                
                {/* 2. BACKGROUND LANDSCAPE (Hills) - Increased Transparency */}
                <div className="absolute bottom-0 w-full h-32 opacity-30 rounded-t-[100%] scale-150 translate-y-12" style={{ backgroundColor: theme.groundColor, filter: 'brightness(0.7)' }}></div>
                
                {/* 3. MIDDLE GROUND (Trees) - Increased Transparency */}
                <div className="absolute bottom-12 left-0 right-0 h-24 px-4 z-0 opacity-40">
                    {trees.map((tree, i) => (
                        <VectorTree 
                            key={i}
                            color={tree.color}
                            className="absolute bottom-0"
                            style={{ 
                                left: tree.left, 
                                height: `${80 * tree.scale}px`, 
                                width: `${60 * tree.scale}px`,
                                transformOrigin: 'bottom center',
                                animation: `sway 4s ease-in-out infinite alternate ${i * 0.5}s`
                            }} 
                        />
                    ))}
                </div>

                {/* 4. FOREGROUND (Ground) - Increased Transparency */}
                <div className="absolute -bottom-10 w-full h-28 rounded-t-[50%] scale-110 z-10 opacity-30" style={{ backgroundColor: theme.groundColor }}></div>

                {/* 5. MASCOT (On Ground) */}
                <div className="absolute bottom-4 left-[10%] z-10 text-5xl animate-bounce [animation-duration:3s] drop-shadow-xl filter brightness-110 opacity-90">
                    {theme.mascot}
                </div>

                {/* 6. UI CONTENT LAYER */}
                <div className="absolute inset-0 z-30 p-6 flex flex-col">
                    
                    {/* Top Section */}
                    <div className="flex justify-between items-start">
                        {/* LEFT: Temp & Stats */}
                        <div className="text-white drop-shadow-md">
                            <p className="text-sm font-medium opacity-80 mb-[-5px]">{t('weather.now')}</p>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[5rem] font-bold leading-none tracking-tighter">
                                    {Math.round(weather.temperature)}°
                                </h2>
                                <div className="mt-2 transform scale-75 opacity-90">
                                    <SkyIcon />
                                </div>
                            </div>
                            <div className="flex gap-3 text-xs font-medium opacity-80 mt-1 ml-1">
                                <span>Min: {Math.round(weather.minTemp || 0)}°</span>
                                <span className="opacity-50">•</span>
                                <span>Max: {Math.round(weather.maxTemp || 0)}°</span>
                            </div>
                        </div>

                        {/* RIGHT: Condition & Location */}
                        <div className="text-right text-white drop-shadow-md pt-2">
                            <p className="text-xl font-bold">{conditionText}</p>
                            <p className="text-xs opacity-80 mb-3">{t('weather.feels_like')}: {feelsLike}°</p>
                            
                            <div className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-medium border border-white/10">
                                <MapPinIcon className="w-3 h-3 text-white" />
                                <span>{locationName}</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle Section: IMPACT PHRASE - CENTERED NO BOX */}
                    <div className="flex-1 flex items-end justify-center pb-4">
                        <div className="flex flex-col items-center max-w-[95%] animate-fade-in-up">
                            <p 
                                className="text-xl md:text-2xl font-bold text-white leading-tight text-center italic"
                                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
                            >
                                {aiContent?.phrase ? `"${aiContent.phrase}"` : ''}
                            </p>
                            
                            <div className="mt-3 inline-block bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
                                <p className="text-[10px] text-teal-200 font-bold uppercase tracking-wider">
                                    🎯 {aiContent?.goal}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right Actions */}
                    <button 
                        onClick={handleShare}
                        disabled={sharing}
                        className="absolute bottom-6 right-6 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition-all shadow-lg border border-white/10"
                    >
                        {sharing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <ShareIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* --- HIDDEN STORY LAYOUT (9:16) - Kept mostly same for sharing --- */}
            <div 
                ref={storyRef}
                style={{ 
                    position: 'fixed', 
                    left: '-9999px', 
                    top: 0, 
                    width: '1080px', 
                    height: '1920px',
                    zIndex: -1 
                }}
                className={`flex flex-col bg-gradient-to-b ${theme.gradient} overflow-hidden font-sans text-white`}
            >
                {/* Story Background Elements */}
                <div className="absolute bottom-0 w-full h-[500px]" style={{ backgroundColor: theme.groundColor }}></div>
                <div className="absolute bottom-[400px] w-full flex justify-between px-20">
                    {trees.map((t, i) => (
                        <VectorTree key={i} color={theme.treeColor} style={{ width: '180px', height: '250px' }} />
                    ))}
                </div>

                <div className="relative z-10 flex flex-col h-full p-16">
                    <div className="flex justify-between items-center mb-20">
                        <div className="text-4xl font-medium opacity-80">{new Date().toLocaleDateString('pt-BR')}</div>
                        <div className="flex items-center gap-4 bg-white/20 px-8 py-4 rounded-full backdrop-blur-xl">
                            <span className="text-2xl">📍</span>
                            <span className="text-2xl font-bold uppercase tracking-widest">{locationName}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-[12rem] font-bold leading-none drop-shadow-2xl mb-4">
                            {Math.round(weather.temperature)}°
                        </div>
                        <div className="text-5xl font-medium opacity-90 mb-12 capitalize">{conditionText}</div>
                        
                        <div className="bg-white/10 backdrop-blur-xl p-12 rounded-[3rem] border border-white/20 shadow-2xl max-w-2xl">
                            <p className="text-4xl font-bold leading-tight italic">"{aiContent?.phrase}"</p>
                            <div className="w-20 h-2 bg-teal-400 rounded-full mx-auto my-8"></div>
                            <p className="text-2xl font-bold uppercase tracking-widest text-teal-200">🎯 {aiContent?.goal}</p>
                        </div>
                    </div>

                    <div className="text-center mt-auto opacity-60 text-2xl font-mono uppercase tracking-[0.5em]">
                        Dr. X Health App
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherHero;
