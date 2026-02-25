
import React, { useState, useRef } from 'react';
import { CameraIcon, CheckCircleIcon, ArrowPathIcon, XMarkIcon, CakeIcon } from '../components/icons';
import { api } from '../services/api';
import { GoogleGenAI } from "@google/genai";
import NutritionReportView from './NutritionReportView';

interface RegisterMealProps {
    onBack: () => void;
    onSaveSuccess: () => void;
}

type MealCaptureStep = 'capture' | 'analysis' | 'review';
type RegisterMealTab = 'register' | 'report';

const RegisterMeal: React.FC<RegisterMealProps> = ({ onBack, onSaveSuccess }) => {
    const [activeTab, setActiveTab] = useState<RegisterMealTab>('register');
    const [captureStep, setCaptureStep] = useState<MealCaptureStep>('capture');
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [foods, setFoods] = useState<string[]>([]);
    const [calories, setCalories] = useState<number>(0);
    const [protein, setProtein] = useState<number>(0);
    const [carbs, setCarbs] = useState<number>(0);
    const [fat, setFat] = useState<number>(0);
    const [portion, setPortion] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setImage(reader.result);
                    analyzeImage(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const analyzeImage = async (base64Image: string) => {
        setCaptureStep('analysis');
        setLoading(true);
        
        try {
            const base64Data = base64Image.split(',')[1];
            // Fix: Initializing GoogleGenAI right before the API call as per guidelines
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Analise esta imagem de comida. Identifique os alimentos, estime calorias totais, proteínas (g), carboidratos (g), gorduras (g) e tamanho da porção.
            Retorne APENAS um JSON válido: { "foods": ["Item 1"], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "portion": "descrição" }`;

            const response = await ai.models.generateContent({
                // Fix: Updated model to gemini-3-flash-preview for latest image understanding capabilities
                model: 'gemini-3-flash-preview',
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                        { text: prompt }
                    ]
                }
            });

            const text = response.text ? response.text.replace(/```json/g, '').replace(/```/g, '').trim() : '';
            const data = text ? JSON.parse(text) : {};

            setFoods(data.foods || []);
            setCalories(data.calories || 0);
            setProtein(data.protein || 0);
            setCarbs(data.carbs || 0);
            setFat(data.fat || 0);
            setPortion(data.portion || '');
            
            setCaptureStep('review');
        } catch (error) {
            console.error("Erro na análise:", error);
            alert("Não foi possível analisar. Edite manualmente.");
            setCaptureStep('review');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMeal = async () => {
        if (!image) return;
        setLoading(true);
        try {
            await api.saveMeal({
                image: image,
                foods,
                calories,
                protein,
                carbs,
                fat,
                portion,
                timestamp: new Date().toISOString()
            });
            onSaveSuccess();
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao salvar refeição: ${error.message || "Tente novamente."}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-slate-950 flex flex-col text-white">
            <header className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Nutrição AI</h1>
                <div className="w-10" />
            </header>

            {/* Tab Navigation */}
            <div className="flex bg-slate-900 border-b border-slate-800">
                <button
                    className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'register' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setActiveTab('register')}
                >
                    Registrar
                    {activeTab === 'register' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></span>}
                </button>
                <button
                    className={`flex-1 py-4 text-sm font-bold transition-all relative ${activeTab === 'report' ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setActiveTab('report')}
                >
                    Relatório
                    {activeTab === 'report' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></span>}
                </button>
            </div>

            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                
                {activeTab === 'register' && (
                    <>
                        {captureStep === 'capture' && (
                            <div className="flex flex-col items-center justify-center h-full w-full gap-8 animate-fade-in">
                                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-56 h-56 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-800 border-dashed group-hover:border-teal-500/50 transition-colors">
                                        <CameraIcon className="w-20 h-20 text-slate-600 group-hover:text-teal-500 transition-colors" />
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-teal-500/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                                
                                <div className="text-center">
                                    <h2 className="text-2xl font-bold text-white mb-2">Foto da Refeição</h2>
                                    <p className="text-slate-400 text-sm max-w-[250px] mx-auto">Aponte a câmera para o prato. A IA identificará calorias e macros.</p>
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleCapture}
                                    className="hidden"
                                />
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full max-w-xs bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-teal-900/30 hover:bg-teal-500 transition-all flex items-center justify-center gap-3"
                                >
                                    <CameraIcon className="w-5 h-5" />
                                    Capturar Foto
                                </button>
                            </div>
                        )}

                        {captureStep === 'analysis' && (
                            <div className="flex flex-col items-center justify-center h-full w-full gap-8 animate-fade-in">
                                <div className="relative w-72 h-72 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                                    {image && <img src={image} alt="Captured" className="w-full h-full object-cover opacity-60" />}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                        <ArrowPathIcon className="w-16 h-16 text-teal-400 animate-spin mb-4" />
                                        <p className="text-lg font-bold text-white animate-pulse">Analisando Prato...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {captureStep === 'review' && (
                            <div className="w-full max-w-md animate-fade-in-up pb-8">
                                <div className="relative h-56 w-full rounded-3xl overflow-hidden mb-6 shadow-2xl border border-slate-800">
                                    {image && <img src={image} alt="Meal" className="w-full h-full object-cover" />}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent p-6 pt-12">
                                        <p className="text-white font-bold text-xl">{foods.join(', ') || 'Alimento detectado'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descrição</label>
                                        <input 
                                            type="text" 
                                            value={foods.join(', ')}
                                            onChange={(e) => setFoods(e.target.value.split(',').map(s => s.trim()))}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-medium text-white focus:outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                            <label className="block text-xs font-bold text-orange-400 uppercase mb-2">Calorias (kcal)</label>
                                            <input 
                                                type="number" 
                                                value={calories}
                                                onChange={(e) => setCalories(Number(e.target.value))}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-bold text-2xl text-white focus:outline-none focus:border-orange-500"
                                            />
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Porção</label>
                                            <input 
                                                type="text" 
                                                value={portion}
                                                onChange={(e) => setPortion(e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-medium text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                                        <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Macronutrientes</h3>
                                        <div className="flex justify-between gap-3">
                                            <div className="flex-1 bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                                                <p className="text-[10px] text-blue-400 uppercase font-bold mb-1">Proteína</p>
                                                <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} className="w-full bg-transparent text-center font-bold text-white focus:outline-none" />
                                            </div>
                                            <div className="flex-1 bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                                                <p className="text-[10px] text-green-400 uppercase font-bold mb-1">Carbo</p>
                                                <input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} className="w-full bg-transparent text-center font-bold text-white focus:outline-none" />
                                            </div>
                                            <div className="flex-1 bg-slate-950 rounded-xl p-3 border border-slate-800 text-center">
                                                <p className="text-[10px] text-yellow-400 uppercase font-bold mb-1">Gordura</p>
                                                <input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} className="w-full bg-transparent text-center font-bold text-white focus:outline-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSaveMeal}
                                        disabled={loading}
                                        className="mt-4 w-full bg-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-teal-500 transition-colors flex items-center justify-center gap-3 disabled:opacity-70"
                                    >
                                        {loading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <CheckCircleIcon className="w-6 h-6" />}
                                        {loading ? 'Salvando...' : 'Confirmar Refeição'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'report' && <NutritionReportView />}
            </main>
        </div>
    );
};

export default RegisterMeal;
