
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Meal, NutritionReport } from '../types';
import { ArrowPathIcon, CakeIcon, FireIcon, CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon } from '../components/icons';

interface NutritionReportViewProps {
    // No onBack prop as it's now embedded
}

const NutritionReportView: React.FC<NutritionReportViewProps> = () => { // Renamed from NutritionDetail
    const [meals, setMeals] = useState<Meal[]>([]);
    const [report, setReport] = useState<NutritionReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const user = await api.getUser();
                const [mealsData, reportData] = await Promise.all([
                    api.getPatientMeals(user.id!),
                    api.getNutritionReport(user.id!)
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
    }, []);

    // Componente de Gráfico de Pizza Simples (CSS/SVG)
    const MacroChart: React.FC<{ p: number, c: number, f: number }> = ({ p, c, f }) => {
        const total = 100;
        // Calcula os offsets para o stroke-dasharray (SVG stroke chart trick)
        // Circunferência de r=16 é aprox 100
        const r = 15.9155; 
        const c1 = c; 
        const c2 = p;
        const c3 = f;

        return (
            <div className="relative w-32 h-32 flex items-center justify-center">
                <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
                    {/* Background */}
                    <circle cx="21" cy="21" r={r} fill="transparent" stroke="#334155" strokeWidth="5" />
                    
                    {/* Carbs (Green) */}
                    <circle cx="21" cy="21" r={r} fill="transparent" stroke="#22c55e" strokeWidth="5"
                        strokeDasharray={`${c1} ${100 - c1}`} strokeDashoffset="0" />
                    
                    {/* Protein (Blue) */}
                    <circle cx="21" cy="21" r={r} fill="transparent" stroke="#3b82f6" strokeWidth="5"
                        strokeDasharray={`${c2} ${100 - c2}`} strokeDashoffset={-c1} />
                    
                    {/* Fat (Yellow) */}
                    <circle cx="21" cy="21" r={r} fill="transparent" stroke="#eab308" strokeWidth="5"
                        strokeDasharray={`${c3} ${100 - c3}`} strokeDashoffset={-(c1 + c2)} />
                </svg>
                <div className="absolute text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Macros</p>
                </div>
            </div>
        );
    };

    const getInsightIcon = (category: string) => {
        switch (category) {
            case 'positive': return <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />;
            case 'needs_attention': return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
            case 'recommendation': return <LightBulbIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />;
            default: return <div className="w-2 h-2 bg-slate-500 rounded-full"></div>;
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center bg-white dark:bg-slate-950"><ArrowPathIcon className="w-8 h-8 text-teal-600 animate-spin" /></div>;

    return (
        <div className="h-full flex flex-col">
            <main className="flex-1 overflow-y-auto w-full"> {/* Removed padding and max-w for embedding */}
                
                {report && (
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden border border-slate-700">
                        {/* Header do Relatório */}
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <h2 className="text-xl font-bold">Desempenho Alimentar</h2>
                                <p className="text-slate-400 text-sm">Baseado nos últimos registros</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${report.score >= 80 ? 'bg-green-500/20 text-green-400' : report.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                Score: {report.score}/100
                            </div>
                        </div>

                        {/* Conteúdo Analítico */}
                        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                            {/* Gráfico */}
                            <div className="flex-shrink-0">
                                <MacroChart 
                                    p={report.macroDistribution.protein} 
                                    c={report.macroDistribution.carbs} 
                                    f={report.macroDistribution.fat} 
                                />
                            </div>

                            {/* Legenda e Stats */}
                            <div className="flex-1 w-full">
                                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                                    <div className="bg-blue-900/30 p-2 rounded-lg border border-blue-500/30">
                                        <p className="text-blue-400 text-xs font-bold">Proteína</p>
                                        <p className="text-lg font-bold">{report.macroDistribution.protein}%</p>
                                    </div>
                                    <div className="bg-green-900/30 p-2 rounded-lg border border-green-500/30">
                                        <p className="text-green-400 text-xs font-bold">Carboidratos</p>
                                        <p className="text-lg font-bold">{report.macroDistribution.carbs}%</p>
                                    </div>
                                    <div className="bg-yellow-900/30 p-2 rounded-lg border border-yellow-500/30">
                                        <p className="text-yellow-400 text-xs font-bold">Gorduras</p>
                                        <p className="text-lg font-bold">{report.macroDistribution.fat}%</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm text-slate-300 border-t border-slate-700 pt-2">
                                    <span>Média Calórica:</span>
                                    <span className="font-bold text-orange-400">{report.dailyAverageCalories} kcal/dia</span>
                                </div>
                            </div>
                        </div>

                        {/* Insights List */}
                        <div className="mt-6 pt-4 border-t border-slate-700">
                            <h3 className="text-sm font-bold text-slate-300 mb-2">Insights do Nutricionista IA</h3>
                            <ul className="space-y-2">
                                {report.insights.map((insight, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-400">
                                        {getInsightIcon(insight.category)}
                                        {insight.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <CakeIcon className="w-5 h-5 text-orange-500" />
                    Histórico de Refeições
                </h3>

                <div className="space-y-4">
                    {meals.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            Nenhum registro encontrado. Comece a fotografar suas refeições!
                        </div>
                    ) : (
                        meals.map(meal => (
                            <div key={meal.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4">
                                <div className="w-24 h-24 flex-shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                                    <img src={meal.image} alt="Meal" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{meal.foods.join(', ')}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{new Date(meal.timestamp).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <span className="text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                            {meal.calories} kcal
                                        </span>
                                    </div>
                                    
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        <div className="text-center bg-slate-50 dark:bg-slate-800 rounded p-1">
                                            <p className="text-[10px] text-slate-400 uppercase">Prot</p>
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{meal.protein}g</p>
                                        </div>
                                        <div className="text-center bg-slate-50 dark:bg-slate-800 rounded p-1">
                                            <p className="text-[10px] text-slate-400 uppercase">Carb</p>
                                            <p className="text-xs font-bold text-green-600 dark:text-green-400">{meal.carbs}g</p>
                                        </div>
                                        <div className="text-center bg-slate-50 dark:bg-slate-800 rounded p-1">
                                            <p className="text-[10px] text-slate-400 uppercase">Gord</p>
                                            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{meal.fat}g</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default NutritionReportView;
