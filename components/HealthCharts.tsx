
import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    BarChart, Bar, LineChart, Line, ReferenceLine
} from 'recharts';

interface ChartDataPoint {
    label: string; // Ex: 'Seg', '10:00'
    value: number; // Valor principal
    value2?: number; // Valor secundário (ex: Pressão Diastólica)
    fullDate?: string; // Para tooltip detalhado
}

// --- TOOLTIP CUSTOMIZADO ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-xl">
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                        {entry.value}
                        <span className="text-xs text-slate-500 font-normal">{entry.unit}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// 1. MINI SPARKLINE (Para Cards Pequenos)
interface MiniSparklineProps {
    data: number[];
    color: string;
    height?: number;
}

export const MiniSparklineChart: React.FC<MiniSparklineProps> = ({ data, color, height = 60 }) => {
    // Transforma array simples em objetos para Recharts
    const chartData = data.map((val, i) => ({ i, value: val }));
    
    return (
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Tooltip cursor={false} content={<CustomTooltip />} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill={`url(#gradient-${color})`} 
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// 2. INTERACTIVE BAR CHART (Atividade)
interface ActivityChartProps {
    data: ChartDataPoint[];
    color: string;
}

export const InteractiveBarChart: React.FC<ActivityChartProps> = ({ data, color }) => {
    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<CustomTooltip />} />
                    <Bar 
                        dataKey="value" 
                        fill={color} 
                        radius={[4, 4, 4, 4]} 
                        barSize={8}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// 3. DETAILED LINE CHART (Biometria / Heart Rate)
interface BiometricsChartProps {
    data: ChartDataPoint[];
    color: string;
    unit?: string;
    showGrid?: boolean;
}

export const BiometricsLineChart: React.FC<BiometricsChartProps> = ({ data, color, unit = '', showGrid = false }) => {
    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`bio-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />}
                    <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 10}} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 10}} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        unit={unit}
                        stroke={color} 
                        strokeWidth={3}
                        fill={`url(#bio-grad-${color})`}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
