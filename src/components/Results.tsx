import React, { useState } from 'react';
import Plot from 'react-plotly.js';
import { SimulationResult } from '../types';

interface ResultsProps {
    results: SimulationResult | null;
    originalData: number[] | null;
    isSimulating: boolean;
    progress: number;
    agreementThresholds: { min: number; des: number; opt: number };
    simulationModel: string;
    sampleSize: number | null;
}

export const Results: React.FC<ResultsProps> = ({ results, originalData, isSimulating, progress, agreementThresholds, simulationModel, sampleSize }) => {
    const [activeTab, setActiveTab] = useState<'instructions' | 'distribution' | 'aps_overall' | 'aps_sublevel'>('instructions');
    const [sublevelTab, setSublevelTab] = useState<string>('');

    // Determine label based on model
    const isMuModel = simulationModel === "Setting APS for measurement uncertainty - Analytical rerun simulation";
    const imprecisionTableLabel = isMuModel ? "Relative standard measurement uncertainty" : "Imprecision";

    // Debug logging
    React.useEffect(() => {
        console.log("Results component received results:", results);
    }, [results]);

    // Initialize sublevel tab when results are available
    React.useEffect(() => {
        if (results && results.names && results.names.length > 0 && !sublevelTab) {
            setSublevelTab(results.names[0]);
        }
    }, [results, sublevelTab]);

    if (isSimulating) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col bg-white">
                <div className="w-64 bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                    <div
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="text-gray-600 font-medium">Simulating... {Math.round(progress)}%</p>
                <p className="text-sm text-gray-400 mt-2">This may take a moment depending on your settings.</p>
            </div>
        );
    }

    const renderSummaryTable = (metric: 'agreement' | 'sensitivity' | 'specificity', levelIndex?: number) => {
        if (!results) return null;

        const getLimit = (threshold: number, type: 'mu' | 'bias_pos' | 'bias_neg') => {
            // Filter points that meet the threshold
            const validPoints = results.mu_data.filter(d => {
                const val = levelIndex !== undefined
                    ? (metric === 'agreement' ? d.sublevel_agreement?.[levelIndex]
                        : metric === 'sensitivity' ? d.sublevel_sensitivity?.[levelIndex]
                            : d.sublevel_specificity?.[levelIndex])
                    : d[metric];
                return (val ?? 0) * 100 >= threshold;
            });

            if (validPoints.length === 0) return "NO"; // Not Obtainable

            if (type === 'mu') {
                // Scale MU by 100
                const maxMu = Math.max(...validPoints.map(d => d.mu * 100));
                return maxMu > 33 ? "NA" : maxMu.toFixed(1);
            } else if (type === 'bias_pos') {
                // Scale Bias by 100
                const maxBias = Math.max(...validPoints.map(d => d.bias * 100));
                return maxBias > 33 ? "NA" : maxBias.toFixed(1);
            } else {
                // Scale Bias by 100
                const minBias = Math.min(...validPoints.map(d => d.bias * 100));
                return Math.abs(minBias) > 33 ? "NA" : minBias.toFixed(1);
            }
        };

        const rows = [
            { label: 'Minimum', threshold: agreementThresholds.min, color: 'text-red-600' },
            { label: 'Desirable', threshold: agreementThresholds.des, color: 'text-green-600' },
            { label: 'Optimal', threshold: agreementThresholds.opt, color: 'text-blue-600' },
        ];

        return (
            <div className="mt-8">
                <h4 className="text-md font-semibold mb-2">APS Limits</h4>
                <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APS Level</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{imprecisionTableLabel}</th>
                            {!isMuModel && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Positive Bias</th>}
                            {!isMuModel && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negative Bias</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((row) => (
                            <tr key={row.label}>
                                <td className={`px-6 py-4 whitespace-nowrap font-medium ${row.color}`}>{row.label}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getLimit(row.threshold, 'mu')}</td>
                                {!isMuModel && <td className="px-6 py-4 whitespace-nowrap">{getLimit(row.threshold, 'bias_pos')}</td>}
                                {!isMuModel && <td className="px-6 py-4 whitespace-nowrap">{getLimit(row.threshold, 'bias_neg')}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-2 text-xs text-gray-500">
                    <p>NA: Not Available (&gt;33%)</p>
                    <p>NO: Not Obtainable</p>
                </div>
            </div>
        );
    };

    const renderScatterPlot = (metric: 'agreement' | 'sensitivity' | 'specificity', title: string, levelIndex?: number, usePastelColors: boolean = false) => {
        if (!results) return null;

        let x: number[], y: number[], z_pct: number[];
        let layout: any;
        let plotData: any[];

        if (isMuModel) {
            // MU Model: Plot Metric (X) vs APS for MU (Y)
            y = results.mu_data.map(d => d.mu * 100); // APS for MU on Y
            x = results.mu_data.map(d => {
                if (levelIndex !== undefined) {
                    const val = metric === 'agreement' ? d.sublevel_agreement?.[levelIndex]
                        : metric === 'sensitivity' ? d.sublevel_sensitivity?.[levelIndex]
                            : d.sublevel_specificity?.[levelIndex];
                    return (val ?? 0) * 100;
                }
                return d[metric] * 100;
            }); // Metric on X

            plotData = [{
                x: x,
                y: y,
                mode: 'lines+markers',
                type: 'scatter',
                marker: { color: '#3b82f6' },
                line: { color: '#3b82f6' },
                name: metric
            }];

            layout = {
                title: { text: title },
                xaxis: { title: { text: 'Metric (%)' }, range: [0, 105] },
                yaxis: { title: { text: 'Relative standard measurement uncertainty (%)' } },
                autosize: true,
                hovermode: 'closest'
            };

        } else {
            // Standard Model: Bias (X) vs Imprecision (Y) with Color (Metric)
            x = results.mu_data.map(d => d.bias * 100);
            y = results.mu_data.map(d => d.mu * 100);

            const z = results.mu_data.map(d => {
                if (levelIndex !== undefined) {
                    const val = metric === 'agreement' ? d.sublevel_agreement?.[levelIndex]
                        : metric === 'sensitivity' ? d.sublevel_sensitivity?.[levelIndex]
                            : d.sublevel_specificity?.[levelIndex];
                    return val ?? 0;
                }
                return d[metric];
            });
            z_pct = z.map(v => v * 100);

            const colors = z_pct.map(val => {
                if (usePastelColors) {
                    if (val >= agreementThresholds.opt) return '#76C7C0';
                    if (val >= agreementThresholds.des) return '#5DADE2';
                    if (val >= agreementThresholds.min) return '#F4D03F';
                    return '#EC7063';
                } else {
                    if (val >= agreementThresholds.opt) return 'rgb(0, 0, 255)';
                    if (val >= agreementThresholds.des) return 'rgb(0, 176, 0)';
                    if (val >= agreementThresholds.min) return 'rgb(166, 0, 0)';
                    return 'rgb(200, 200, 200)';
                }
            });

            plotData = [{
                x: x,
                y: y,
                mode: 'markers',
                type: 'scatter',
                marker: {
                    color: colors,
                    size: 8,
                    opacity: 0.7,
                    line: { width: 1, color: 'black' }
                },
                text: z_pct.map(v => `${metric}: ${v.toFixed(1)}%`),
                hoverinfo: 'x+y+text',
                name: metric
            }];

            layout = {
                title: { text: title },
                xaxis: { title: { text: 'Bias (%)' } },
                yaxis: { title: { text: 'Imprecision (%)' } },
                autosize: true,
                hovermode: 'closest'
            };
        }

        return (
            <div className="h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="flex-1 min-h-[500px]">
                    <Plot
                        data={plotData}
                        layout={layout}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
                {renderSummaryTable(metric, levelIndex)}
            </div>
        );
    };

    const renderCombinedPlot = (levelIndex: number) => {
        if (!results) return null;

        if (isMuModel) {
            // MU Model: Plot Sensitivity and Specificity vs APS for MU
            const y = results.mu_data.map(d => d.mu * 100);
            const x_sens = results.mu_data.map(d => (d.sublevel_sensitivity?.[levelIndex] ?? 0) * 100);
            const x_spec = results.mu_data.map(d => (d.sublevel_specificity?.[levelIndex] ?? 0) * 100);

            return (
                <div className="h-full flex flex-col mt-12">
                    <h3 className="text-lg font-semibold mb-4">Sensitivity & Specificity vs Relative standard measurement uncertainty</h3>
                    <div className="flex-1 min-h-[500px]">
                        <Plot
                            data={[
                                {
                                    x: x_sens, y: y, mode: 'lines+markers', type: 'scatter', name: 'Sensitivity',
                                    line: { color: '#76C7C0' }
                                },
                                {
                                    x: x_spec, y: y, mode: 'lines+markers', type: 'scatter', name: 'Specificity',
                                    line: { color: '#AED6F1' }
                                }
                            ]}
                            layout={{
                                title: { text: 'Sensitivity & Specificity' },
                                xaxis: { title: { text: 'Metric (%)' }, range: [0, 105] },
                                yaxis: { title: { text: 'Relative standard measurement uncertainty (%)' } },
                                autosize: true,
                                hovermode: 'closest'
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>
            );
        }

        // Standard Model Logic (Bias vs Imprecision with Categories)
        const x = results.mu_data.map(d => d.bias * 100);
        const y = results.mu_data.map(d => d.mu * 100);

        const categories = results.mu_data.map(d => {
            const sens = (d.sublevel_sensitivity?.[levelIndex] ?? 0) * 100;
            const spec = (d.sublevel_specificity?.[levelIndex] ?? 0) * 100;
            const min = agreementThresholds.min;
            const sensPass = sens >= min;
            const specPass = spec >= min;
            if (sensPass && specPass) return "Sensitivity & Specificity";
            if (sensPass) return "Sensitivity";
            if (specPass) return "Specificity";
            return "Other";
        });

        const uniqueCategories = ["Sensitivity & Specificity", "Sensitivity", "Specificity", "Other"];
        const categoryColors: Record<string, string> = {
            "Sensitivity & Specificity": '#F4D03F',
            "Sensitivity": '#76C7C0',
            "Specificity": '#AED6F1',
            "Other": '#D7DBDD'
        };

        const traces = uniqueCategories.map(cat => {
            const indices = categories.map((c, i) => c === cat ? i : -1).filter(i => i !== -1);
            if (indices.length === 0) return null;
            return {
                x: indices.map(i => x[i]),
                y: indices.map(i => y[i]),
                mode: 'markers',
                type: 'scatter' as const,
                name: `≥${agreementThresholds.min}% (${cat})`,
                marker: {
                    color: categoryColors[cat],
                    size: 8,
                    opacity: 0.7,
                    line: { width: 1, color: 'black' }
                },
                hoverinfo: 'x+y+name' as const
            };
        }).filter(t => t !== null);

        return (
            <div className="h-full flex flex-col mt-12">
                <h3 className="text-lg font-semibold mb-4">Combined Sensitivity & Specificity (≥{agreementThresholds.min}%)</h3>
                <div className="flex-1 min-h-[500px]">
                    <Plot
                        data={traces as any}
                        layout={{
                            title: { text: `Combined Plot (≥${agreementThresholds.min}%)` },
                            xaxis: { title: { text: 'Bias (%)' } },
                            yaxis: { title: { text: 'Imprecision (%)' } },
                            autosize: true,
                            hovermode: 'closest',
                            legend: { title: { text: 'Combined Category' } }
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            </div>
        );
    };

    const render3DPlot = (levelIndex?: number) => {
        if (!results || isMuModel) return null; // Hide 3D plot for MU model

        const x = results.mu_data.map(d => d.bias * 100);
        const y = results.mu_data.map(d => d.mu * 100);

        const getZ = (metric: 'agreement' | 'sensitivity' | 'specificity') => results.mu_data.map(d => {
            if (levelIndex !== undefined) {
                const val = metric === 'agreement' ? d.sublevel_agreement?.[levelIndex]
                    : metric === 'sensitivity' ? d.sublevel_sensitivity?.[levelIndex]
                        : d.sublevel_specificity?.[levelIndex];
                return val ?? 0;
            }
            return d[metric];
        }).map(v => v * 100);

        const z_agree = getZ('agreement');
        const z_sens = getZ('sensitivity');
        const z_spec = getZ('specificity');

        return (
            <div className="h-[600px] mt-8">
                <h3 className="text-lg font-semibold mb-4">3D Visualization</h3>
                <Plot
                    data={[
                        {
                            x: x, y: y, z: z_agree,
                            mode: 'markers',
                            type: 'scatter3d',
                            marker: { size: 3, color: z_agree, colorscale: 'Viridis', opacity: 0.8 },
                            name: 'Agreement'
                        },
                        {
                            x: x, y: y, z: z_sens,
                            mode: 'markers',
                            type: 'scatter3d',
                            marker: { size: 3, color: 'rgb(128, 0, 128)', opacity: 0.6, symbol: 'diamond' },
                            name: 'Sensitivity'
                        },
                        {
                            x: x, y: y, z: z_spec,
                            mode: 'markers',
                            type: 'scatter3d',
                            marker: { size: 3, color: 'rgb(204, 85, 119)', opacity: 0.6, symbol: 'circle' },
                            name: 'Specificity'
                        }
                    ]}
                    layout={{
                        title: { text: '3D Scatter Plot of Bias, Imprecision, and Metrics' },
                        scene: {
                            xaxis: { title: { text: 'Bias (%)' } },
                            yaxis: { title: { text: 'Imprecision (%)' } },
                            zaxis: { title: { text: 'Metric (%)' } }
                        },
                        autosize: true,
                        margin: { l: 0, r: 0, b: 0, t: 0 }
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        );
    };





    // Assuming renderSummaryTable is defined elsewhere or its definition is not part of this change.
    // If renderSummaryTable needs to be modified to call renderCategoryTable, that would be a separate instruction.

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="flex justify-center bg-white p-4 border-b border-gray-100">
                <img src="/icon.png" alt="Logo" className="w-full max-w-3xl h-auto" />
            </div>
            <div className="border-b border-gray-200 bg-gray-50">
                <nav className="flex -mb-px px-4 overflow-x-auto" aria-label="Tabs">
                    {[
                        { id: 'instructions', label: 'Instructions' },
                        { id: 'distribution', label: 'Distribution' },
                        { id: 'aps_overall', label: 'APS (Overall Agreement)' },
                        { id: 'aps_sublevel', label: 'APS (Sublevel Agreement)' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'instructions' && (
                    <div className="prose max-w-none">
                        <div className="flex flex-col items-center justify-center bg-white p-8 text-center">
                            <h1 className="text-2xl font-bold text-gray-800 mb-2">APS Calculator</h1>
                            <p className="text-gray-500 max-w-md">
                                A Data-Driven Tool for Setting Outcome-Based Analytical Performance Specifications.
                            </p>
                            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-lg text-left">
                                <h3 className="text-blue-800 font-semibold mb-2">Instructions</h3>
                                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                                    <li>Upload your data (.xlsx or .csv).</li>
                                    <li>Select the measurand column.</li>
                                    <li>Configure Clinical Decision Limits (CDLs).</li>
                                    <li>Set Agreement Thresholds.</li>
                                    <li>Click "Simulate & Calculate".</li>
                                </ol>
                            </div>
                            <div className="mt-6 text-xs text-gray-400 font-medium">
                                Developed by Hikmet Can Çubukçu, MD, PhD, MSc, EuSpLM, hikmetcancubukcu@gmail.com
                            </div>
                        </div>
                        {results && (
                            <div className="mt-8">
                                <h4 className="text-lg font-semibold mb-4">Simulation Summary</h4>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p><strong>Sample Size:</strong> {sampleSize || originalData?.length || 0}</p>
                                    {isMuModel ? (
                                        <p><strong>Max measurement uncertainty:</strong> {Math.max(...results.mu_data.map(d => d.mu * 100)).toFixed(1)}%</p>
                                    ) : (
                                        <>
                                            <p><strong>Max Imprecision (CV):</strong> {Math.max(...results.mu_data.map(d => d.mu * 100)).toFixed(1)}%</p>
                                            <p><strong>Max Bias (%):</strong> {Math.max(...results.mu_data.map(d => d.bias * 100)).toFixed(1)}%</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {activeTab === 'distribution' && originalData && (
                    <div className="h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Histogram of Original Data</h3>
                        <div className="flex-1 min-h-[400px]">
                            <Plot
                                data={[
                                    {
                                        x: originalData,
                                        type: 'histogram',
                                        marker: { color: '#3b82f6' },
                                        opacity: 0.7,
                                        name: 'Frequency'
                                    }
                                ]}
                                layout={{
                                    title: { text: 'Distribution of Original Data' },
                                    xaxis: { title: { text: 'Value' } },
                                    yaxis: { title: { text: 'Frequency' } },
                                    autosize: true,
                                    margin: { l: 50, r: 50, t: 50, b: 50 }
                                }}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'aps_overall' && (
                    <div className="space-y-12">
                        {renderScatterPlot('agreement', 'Overall Agreement', undefined, false)}
                        {render3DPlot()}
                    </div>
                )}

                {activeTab === 'aps_sublevel' && results && (
                    <div>
                        <div className="mb-6 border-b border-gray-200">
                            <nav className="flex space-x-4" aria-label="Sublevel Tabs">
                                {results.names.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => setSublevelTab(name)}
                                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${sublevelTab === name
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {results.names.map((name, idx) => (
                            sublevelTab === name && (
                                <div key={name} className="space-y-12">
                                    {renderScatterPlot('agreement', `Agreement for ${name}`, idx, true)}
                                    {renderScatterPlot('sensitivity', `Sensitivity for ${name}`, idx, true)}
                                    {renderScatterPlot('specificity', `Specificity for ${name}`, idx, true)}
                                    {renderCombinedPlot(idx)}
                                    {render3DPlot(idx)}
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};

