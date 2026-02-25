
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Meal, NutritionReport, NutritionInsight } from '../types';
import { ArrowPathIcon, CakeIcon, CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon, ShareIcon, ChartBarIcon, ChevronRightIcon } from '../components/icons';

interface NutritionReportViewProps {
    patientId?: string; // Optional: If provided, fetches data for this patient. If not, fetches for current user.
}

const NutritionReportView: React.FC<NutritionReportViewProps> = ({ patientId }) => {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [report, setReport] = useState<NutritionReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                // Determine which ID to use. If patientId is passed (doctor view), use it.
                // Otherwise, get the current user's ID (patient view).
                let targetId = patientId;
                if (!targetId) {
                    const user = await api.getUser();
                    targetId = user.id!;
                }

                const [mealsData, reportData] = await Promise.all([
                    api.getPatientMeals(targetId),
                    api.getNutritionReport(targetId)
                ]);
                setMeals(mealsData);
                setReport(reportData);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [patientId]);

    const MacroBar: React.FC<{ label: string, value: number, color: string }> = ({ label, value, color }) => (
        <div className="flex-1 text-center">
            <div className="h-24 w-4 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto relative overflow-hidden mb-2">
                <div 
                    className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-1000 ${color}`} 
                    style={{ height: `${Math.min(value, 100)}%` }} // Ensure it doesn't overflow visually
                ></div>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{value}%</p>
        </div>
    );

    const getInsightIcon = (category: NutritionInsight['category']) => {
        switch (category) {
            case 'positive': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'needs_attention': return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
            case 'recommendation': return <LightBulbIcon className="w-5 h-5 text-blue-500" />;
            default: return <div className="w-2 h-2 bg-slate-500 rounded-full"></div>;
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-emerald-500 animate-spin" /></div>;

    const hasRefeicoes = meals.length > 0;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 animate-fade-in-right">
            
            {/* Header - Only show if NOT embedded (i.e. no patientId passed means it's the main patient screen) */}
            {!patientId && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h1 className="text-xl font-bold tracking-tight">Nutrição</h1>
                    <div className="flex gap-2 text-slate-400">
                        <span className="text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded font-mono">HOJE</span>
                    </div>
                </div>
            )}

            <main className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 pt-6">
                
                {/* 1. Hero Card - Calories & Score */}
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden text-center border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500 to-teal-900 opacity-10 dark:opacity-20 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center border-4 border-emerald-200 dark:border-emerald-500/20 mb-4 shadow-xl">
                            <CakeIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-5xl font-bold text-slate-800 dark:text-white mb-1 tracking-tighter">
                            {report?.score || 0} <span className="text-xl text-slate-500 font-normal">pts</span>
                        </h2>
                        <p className="text-emerald-600 dark:text-emerald-300 text-sm font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                            Score Nutricional
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2">Média: {report?.dailyAverageCalories || 0} kcal</p>
                    </div>
                </div>

                {/* 2. Macro Chart Card */}
                {report && hasRefeicoes && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-slate-800 dark:text-white font-bold mb-6 text-lg">Distribuição de Macros</h3>
                        <div className="flex justify-around items-end px-4">
                            <MacroBar label="Proteína" value={report.macroDistribution.protein} color="bg-blue-500" />
                            <MacroBar label="Carbo" value={report.macroDistribution.carbs} color="bg-emerald-500" />
                            <MacroBar label="Gordura" value={report.macroDistribution.fat} color="bg-amber-500" />
                        </div>
                    </div>
                )}

                {/* 3. Insights List */}
                {report && report.insights.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider ml-1">Análise Inteligente</h3>
                        {report.insights.map((insight, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-4 items-start shadow-sm">
                                <div className="mt-0.5">{getInsightIcon(insight.category)}</div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{insight.message}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. Meal History */}
                <div>
                    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider ml-1 mb-3">Refeições Recentes</h3>
                    <div className="space-y-4">
                        {!hasRefeicoes ? (
                            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                <CakeIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                <p className="text-sm font-medium">Nenhuma refeição registrada.</p>
                                <p className="text-xs mt-1 opacity-70">Toque em "Registrar" para começar.</p>
                            </div>
                        ) : (
                            meals.map(meal => (
                                <div key={meal.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 flex gap-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="w-20 h-20 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative">
                                        <img src={meal.image} alt="Meal" className="w-full h-full object-cover opacity-90" />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{meal.foods.join(', ')}</p>
                                            <span className="text-emerald-500 dark:text-emerald-400 font-bold text-xs bg-emerald-100 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                                                {meal.calories} kcal
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-mono mb-2">{new Date(meal.timestamp).toLocaleString('pt-BR')}</p>
                                        
                                        <div className="flex gap-2 text-[10px] text-slate-500">
                                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">P: {meal.protein}g</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">C: {meal.carbs}g</span>
                                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">G: {meal.fat}g</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default NutritionReportView;
