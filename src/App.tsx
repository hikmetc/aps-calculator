import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { Results } from "./components/Results";
import { AppState, SimulationResult } from "./types";

function App() {
  const [state, setState] = useState<AppState>({
    simulationModel: "Setting APS for measurement uncertainty - Analytical rerun simulation",
    filePath: null,
    analyteName: null,
    decimalPlaces: 0,
    cdls: [0],
    agreementThresholds: { min: 90, des: 95, opt: 99 },
    biologicalVariation: 0,
    sampleSize: null,
    maxImprecision: 33.3,
    maxBias: 35,
    maxMu: 33.1,
    stepSizeMu: 0.1,
    stepSizeImpBias: 1.0,
    useCustomBoundaries: false,
  });

  const [columns, setColumns] = useState<string[]>([]);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [originalData, setOriginalData] = useState<number[] | null>(null);
  const [dataCount, setDataCount] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Reset results when simulation model changes
  useEffect(() => {
    setResults(null);
  }, [state.simulationModel]);

  // Fetch data count when file or column changes
  useEffect(() => {
    const fetchDataCount = async () => {
      if (state.filePath && state.analyteName) {
        try {
          const data = await invoke<number[]>('load_column_data', {
            path: state.filePath,
            column: state.analyteName
          });
          setDataCount(data.length);
          // Also update originalData here to show histogram immediately if desired, 
          // but for now just getting count is enough. 
          // Actually, might as well set originalData here to avoid double fetching later if we optimize handleSimulate.
          // But let's stick to just count for safety to not break existing flow too much.
        } catch (error) {
          console.error("Error loading data count:", error);
          setDataCount(null);
        }
      } else {
        setDataCount(null);
      }
    };
    fetchDataCount();
  }, [state.filePath, state.analyteName]);

  const handleUpload = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Excel/CSV',
          extensions: ['xlsx', 'xls', 'csv']
        }]
      });

      if (selected && typeof selected === 'string') {
        const cols = await invoke<string[]>('get_file_columns', { path: selected });
        setColumns(cols);
        if (cols.length > 0) {
          setState(prev => ({ ...prev, filePath: selected, analyteName: cols[0] }));
        } else {
          setState(prev => ({ ...prev, filePath: selected, analyteName: null }));
        }
      }
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Failed to open file: " + error);
    }
  };

  const [progress, setProgress] = useState(0);

  // ...

  const handleSimulate = async () => {
    if (!state.filePath || !state.analyteName) return;

    setIsSimulating(true);
    setProgress(0);

    // Listen for progress
    const unlisten = await listen<number>('simulation-progress', (event) => {
      setProgress(event.payload);
    });

    try {
      // Load data first
      const data = await invoke<number[]>('load_column_data', {
        path: state.filePath,
        column: state.analyteName
      });
      setOriginalData(data);

      // Prepare config
      const config = {
        model: state.simulationModel,
        data: data,
        cdls: state.cdls,
        decimal_places: state.decimalPlaces,
        agreement_thresholds: [
          state.agreementThresholds.min,
          state.agreementThresholds.des,
          state.agreementThresholds.opt
        ],
        cv_i: state.biologicalVariation > 0 ? state.biologicalVariation : null,
        sample_size: state.sampleSize,
        max_imprecision: state.useCustomBoundaries ? state.maxImprecision : null,
        max_bias: state.useCustomBoundaries ? state.maxBias : null,
        max_mu: state.useCustomBoundaries ? state.maxMu : null,
        step_size_mu: state.useCustomBoundaries ? state.stepSizeMu : null,
        step_size_imp_bias: state.useCustomBoundaries ? state.stepSizeImpBias : null
      };

      const result = await invoke<SimulationResult>('run_simulation_async', { config });
      setResults(result);
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Simulation failed: " + error);
    } finally {
      unlisten();
      setIsSimulating(false);
    }
  };

  return (
    <Layout
      sidebar={
        <Sidebar
          state={state}
          setState={setState}
          columns={columns}
          onUpload={handleUpload}
          onSimulate={handleSimulate}
          isSimulating={isSimulating}
          dataCount={dataCount}
        />
      }
      content={
        <Results
          results={results}
          originalData={originalData}
          isSimulating={isSimulating}
          progress={progress}
          agreementThresholds={state.agreementThresholds}
          simulationModel={state.simulationModel}
          sampleSize={state.sampleSize}
        />
      }
    />
  );
}

export default App;
