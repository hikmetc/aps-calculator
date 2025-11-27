export type SimulationModel =
    | "Setting APS for measurement uncertainty - Analytical rerun simulation"
    | "Setting APS for measurement uncertainty - Resampling simulation"
    | "Setting APS for imprecision and bias - Analytical rerun simulation"
    | "Setting APS for imprecision and bias - Resampling simulation";

export interface AppState {
    simulationModel: SimulationModel;
    filePath: string | null;
    analyteName: string | null;
    decimalPlaces: number;
    cdls: number[];
    agreementThresholds: {
        min: number;
        des: number;
        opt: number;
    };
    biologicalVariation: number;
    sampleSize: number | null;
    // Advanced Simulation Settings
    maxImprecision: number; // For Imp/Bias models
    maxBias: number;        // For Imp/Bias models
    maxMu: number;          // For MU models
    stepSizeMu: number;     // For MU models
    stepSizeImpBias: number;// For Imp/Bias models
    useCustomBoundaries: boolean;
}

export interface SimulationPoint {
    mu: number;
    bias: number;
    agreement: number;
    sensitivity: number;
    specificity: number;
    agreement_cat: string;
    sensitivity_cat: string;
    specificity_cat: string;
    sublevel_agreement: number[];
    sublevel_sensitivity: number[];
    sublevel_specificity: number[];
}

export interface SimulationResult {
    mu_data: SimulationPoint[];
    names: string[];
}
