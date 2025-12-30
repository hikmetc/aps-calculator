import React from 'react';
import { AppState, SimulationModel } from '../types';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface SidebarProps {
    state: AppState;
    setState: React.Dispatch<React.SetStateAction<AppState>>;
    columns: string[];
    onUpload: () => void;
    onSimulate: () => void;
    isSimulating: boolean;
    dataCount: number | null;
}

const SIMULATION_MODELS: SimulationModel[] = [
    "Setting APS for measurement uncertainty - Analytical rerun simulation",
    "Setting APS for measurement uncertainty - Resampling simulation",
    "Setting APS for imprecision and bias - Analytical rerun simulation",
    "Setting APS for imprecision and bias - Resampling simulation"
];

export const Sidebar: React.FC<SidebarProps> = ({ state, setState, columns, onUpload, onSimulate, isSimulating, dataCount }) => {

    const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setState(prev => ({ ...prev, simulationModel: e.target.value as SimulationModel }));
    };

    const updateCDL = (index: number, value: number) => {
        const newCDLs = [...state.cdls];
        newCDLs[index] = value;
        setState(prev => ({ ...prev, cdls: newCDLs }));
    };

    const addCDL = () => {
        if (state.cdls.length < 7) {
            setState(prev => ({ ...prev, cdls: [...prev.cdls, 0] }));
        }
    };

    const removeCDL = () => {
        if (state.cdls.length > 1) {
            setState(prev => ({ ...prev, cdls: prev.cdls.slice(0, -1) }));
        }
    };

    return (
        <div className="w-80 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto p-4 flex flex-col gap-6">
            <div>
                <h2 className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wider">Simulation Model</h2>
                <div className="flex flex-col gap-2">
                    {SIMULATION_MODELS.map((model) => (
                        <label key={model} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-gray-100 p-1 rounded">
                            <input
                                type="radio"
                                name="simulationModel"
                                value={model}
                                checked={state.simulationModel === model}
                                onChange={handleModelChange}
                                className="mt-0.5"
                            />
                            <span className="leading-tight text-gray-700">{model}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
                <button
                    onClick={onUpload}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
                >
                    <Upload size={16} />
                    {state.filePath ? 'Change File' : 'Upload .xlsx / .csv'}
                </button>
                {state.filePath && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <FileSpreadsheet size={14} />
                        <span className="truncate">{state.filePath.split(/[/\\]/).pop()}</span>
                    </div>
                )}
            </div>

            {columns.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Measurand Name</label>
                    <select
                        className="w-full border border-gray-300 rounded-md p-2 text-sm"
                        value={state.analyteName || ''}
                        onChange={(e) => setState(prev => ({ ...prev, analyteName: e.target.value }))}
                    >
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                </div>
            )}

            <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
                <input
                    type="number"
                    min={0} max={12}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={state.decimalPlaces}
                    onChange={(e) => setState(prev => ({ ...prev, decimalPlaces: parseInt(e.target.value) || 0 }))}
                />
            </div>

            <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Clinical Decision Limits</label>
                    <div className="flex gap-1">
                        <button onClick={removeCDL} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" disabled={state.cdls.length <= 1}>-</button>
                        <button onClick={addCDL} className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300" disabled={state.cdls.length >= 7}>+</button>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    {state.cdls.map((cdl, idx) => (
                        <input
                            key={idx}
                            type="number"
                            step="any"
                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                            placeholder={`CDL ${idx + 1}`}
                            value={cdl}
                            onChange={(e) => updateCDL(idx, parseFloat(e.target.value) || 0)}
                        />
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter in ascending order.</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Agreement Thresholds (%)</label>
                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <span className="text-xs text-gray-500 block">Min</span>
                        <input
                            type="number" step="0.01"
                            className="w-full border border-gray-300 rounded-md p-1 text-sm"
                            value={state.agreementThresholds.min}
                            onChange={(e) => setState(prev => ({ ...prev, agreementThresholds: { ...prev.agreementThresholds, min: parseFloat(e.target.value) } }))}
                        />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block">Des</span>
                        <input
                            type="number" step="0.01"
                            className="w-full border border-gray-300 rounded-md p-1 text-sm"
                            value={state.agreementThresholds.des}
                            onChange={(e) => setState(prev => ({ ...prev, agreementThresholds: { ...prev.agreementThresholds, des: parseFloat(e.target.value) } }))}
                        />
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 block">Opt</span>
                        <input
                            type="number" step="0.01"
                            className="w-full border border-gray-300 rounded-md p-1 text-sm"
                            value={state.agreementThresholds.opt}
                            onChange={(e) => setState(prev => ({ ...prev, agreementThresholds: { ...prev.agreementThresholds, opt: parseFloat(e.target.value) } }))}
                        />
                    </div>
                </div>
            </div>

            {(state.simulationModel.includes("Resampling")) && (
                <div className="border-t border-gray-200 pt-4">
                    <label className="block text-sm font-medium text-blue-600 mb-1">Within-subject Bio Variation (CV_i)</label>
                    <input
                        type="number" step="0.1"
                        className="w-full border border-blue-200 bg-blue-50 rounded-md p-2 text-sm"
                        value={state.biologicalVariation}
                        onChange={(e) => setState(prev => ({ ...prev, biologicalVariation: parseFloat(e.target.value) || 0 }))}
                    />
                </div>
            )}

            <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="checkbox"
                        id="useCustomBoundaries"
                        checked={state.useCustomBoundaries}
                        onChange={(e) => setState(prev => ({ ...prev, useCustomBoundaries: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="useCustomBoundaries" className="text-sm font-medium text-gray-700 select-none">
                        Adjust Simulation Boundaries
                    </label>
                </div>

                {state.useCustomBoundaries && (
                    <>
                        {state.simulationModel.includes("measurement uncertainty") ? (
                            <div className="space-y-2 ml-6 border-l-2 border-gray-200 pl-2">
                                <div>
                                    <span className="text-xs text-gray-500 block">Max Measurement Uncertainty (%)</span>
                                    <input
                                        type="number" step="0.1" max="33.3"
                                        className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                        value={state.maxMu}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) setState(prev => ({ ...prev, maxMu: Math.min(val, 33.3) }));
                                            else setState(prev => ({ ...prev, maxMu: 0 }));
                                        }}
                                    />
                                    <p className="text-[10px] text-gray-400">Max: 33.3%</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Step Size (%)</span>
                                    <input
                                        type="number" step="0.1"
                                        className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                        value={state.stepSizeMu}
                                        onChange={(e) => setState(prev => ({ ...prev, stepSizeMu: parseFloat(e.target.value) || 0.5 }))}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 ml-6 border-l-2 border-gray-200 pl-2">
                                <div>
                                    <span className="text-xs text-gray-500 block">Max Imprecision (CV%)</span>
                                    <input
                                        type="number" step="0.1" max="33.3"
                                        className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                        value={state.maxImprecision}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) setState(prev => ({ ...prev, maxImprecision: Math.min(val, 33.3) }));
                                            else setState(prev => ({ ...prev, maxImprecision: 0 }));
                                        }}
                                    />
                                    <p className="text-[10px] text-gray-400">Max: 33.3%</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Max Bias (%)</span>
                                    <input
                                        type="number" step="0.1" max="100"
                                        className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                        value={state.maxBias}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val)) setState(prev => ({ ...prev, maxBias: Math.min(val, 100) }));
                                            else setState(prev => ({ ...prev, maxBias: 0 }));
                                        }}
                                    />
                                    <p className="text-[10px] text-gray-400">Max: 100%</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block">Step Size (%)</span>
                                    <input
                                        type="number" step="0.1"
                                        className="w-full border border-gray-300 rounded-md p-1 text-sm"
                                        value={state.stepSizeImpBias}
                                        onChange={(e) => setState(prev => ({ ...prev, stepSizeImpBias: parseFloat(e.target.value) || 0.5 }))}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <input
                        type="checkbox"
                        id="useSampling"
                        checked={state.sampleSize !== null}
                        onChange={(e) => setState(prev => ({ ...prev, sampleSize: e.target.checked ? (dataCount || 1000) : null }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="useSampling" className="text-sm font-medium text-gray-700 select-none">
                        Optional Sampling
                    </label>
                </div>
                {state.sampleSize !== null && (
                    <div>
                        <input
                            type="number"
                            min="1"
                            max={dataCount || undefined}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm"
                            value={state.sampleSize}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const max = dataCount || Infinity;
                                if (!isNaN(val)) {
                                    setState(prev => ({ ...prev, sampleSize: Math.min(val, max) }));
                                } else {
                                    setState(prev => ({ ...prev, sampleSize: 0 })); // Allow clearing to type
                                }
                            }}
                            placeholder={`Max: ${dataCount || '...'}`}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Number of data points to use. {dataCount ? `(Max: ${dataCount})` : ''}
                        </p>
                    </div>
                )}
            </div>

            <div className="pt-4 mt-auto">
                <button
                    onClick={onSimulate}
                    disabled={isSimulating || !state.filePath || !state.analyteName}
                    className={`w-full py-3 rounded-md text-white font-medium shadow-md transition-all ${isSimulating || !state.filePath || !state.analyteName
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                        }`}
                >
                    {isSimulating ? 'Simulating...' : 'Simulate & Calculate'}
                </button>
            </div>
        </div>
    );
};
