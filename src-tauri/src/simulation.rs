use rayon::prelude::*;
use rand::prelude::*;
use rand_distr::StandardNormal;
use serde::{Serialize, Deserialize};
use std::f64;
use tauri::{Emitter, Window};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimulationConfig {
    pub model: String,
    pub data: Vec<f64>,
    pub cdls: Vec<f64>,
    pub decimal_places: u32,
    pub agreement_thresholds: AgreementThresholds,
    pub cv_i: Option<f64>,
    pub sample_size: Option<usize>,
    pub max_imprecision: Option<f64>,
    pub max_bias: Option<f64>,
    pub max_mu: Option<f64>,
    pub step_size_mu: Option<f64>,
    pub step_size_imp_bias: Option<f64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgreementThresholds {
    pub min: f64,
    pub des: f64,
    pub opt: f64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SimulationResult {
    pub mu_data: Vec<SimulationPoint>,
    pub names: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimulationPoint {
    pub mu: f64,
    pub bias: f64,
    pub agreement: f64,
    pub sensitivity: f64,
    pub specificity: f64,
    pub agreement_cat: String,
    pub sensitivity_cat: String,
    pub specificity_cat: String,
    pub sublevel_agreement: Vec<f64>,
    pub sublevel_sensitivity: Vec<f64>,
    pub sublevel_specificity: Vec<f64>,
}

enum SimulationModel {
    MuAnalytical,
    MuResampling,
    ImpBiasAnalytical,
    ImpBiasResampling,
}

impl SimulationModel {
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "Setting APS for measurement uncertainty - Analytical rerun simulation" => Some(Self::MuAnalytical),
            "Setting APS for measurement uncertainty - Resampling simulation" => Some(Self::MuResampling),
            "Setting APS for imprecision and bias - Analytical rerun simulation" => Some(Self::ImpBiasAnalytical),
            "Setting APS for imprecision and bias - Resampling simulation" => Some(Self::ImpBiasResampling),
            _ => None,
        }
    }
}

// Helper to categorize a value
fn categorize(value: f64, bins: &[f64], names: &[String]) -> usize {
    for i in 1..bins.len() {
        if value < bins[i] {
            return i - 1;
        }
    }
    names.len() - 1 // Last category
}

// Helper to round
fn round_to(value: f64, decimals: u32) -> f64 {
    let multiplier = 10f64.powi(decimals as i32);
    (value * multiplier).round() / multiplier
}


pub fn run_simulation<R: tauri::Runtime>(config: SimulationConfig, app_handle: Option<&tauri::AppHandle<R>>) -> SimulationResult {
    // 1. Prepare Bins and Names
    let mut bins = vec![f64::NEG_INFINITY];
    // Python code uses: [0, cdl_1-epsilon, cdl_2, ..., inf]
    // But effectively it splits by CDLs.
    // My previous implementation: [-inf, cdl1, cdl2, ..., inf]
    // This matches the logic of <CDL1, CDL1-CDL2, >CDL2.
    bins.extend(&config.cdls);
    bins.push(f64::INFINITY);

    let mut names = Vec::new();
    if config.cdls.len() == 1 {
        names.push(format!("<{}", config.cdls[0]));
        names.push(format!("≥{}", config.cdls[0]));
    } else {
        names.push(format!("<{}", config.cdls[0]));
        for i in 0..config.cdls.len() - 1 {
            names.push(format!("≥{} and <{}", config.cdls[i], config.cdls[i+1]));
        }
        names.push(format!("≥{}", config.cdls[config.cdls.len()-1]));
    }

    // 2. Prepare Data (Subsampling if needed)
    let mut data = config.data.clone();
    if let Some(sample_size) = config.sample_size {
        if sample_size < data.len() {
            let mut rng = StdRng::seed_from_u64(42);
            data.shuffle(&mut rng);
            data.truncate(sample_size);
        }
    }

    // 3. Categorize Original Data
    let original_cats: Vec<usize> = data.iter()
        .map(|&val| categorize(val, &bins, &names))
        .collect();

    // 4. Define Simulation Steps based on Model
    let model = SimulationModel::from_str(&config.model).unwrap_or(SimulationModel::MuAnalytical);
    
    let (e_steps, f_steps) = match model {
        SimulationModel::MuAnalytical | SimulationModel::MuResampling => {
            // MU Simulation
            // Default: 0 to 33.1% with 0.1% step
            let max_mu = config.max_mu.unwrap_or(33.1);
            let step_mu = config.step_size_mu.unwrap_or(0.1);
            
            // Convert to fractions
            let step_frac = step_mu / 100.0;
            let num_steps = (max_mu / step_mu).round() as i32;
            
            let e: Vec<f64> = (0..=num_steps).map(|i| i as f64 * step_frac).collect();
            let f = vec![0.0]; // Bias is 0 for MU simulation
            (e, f)
        },
        SimulationModel::ImpBiasAnalytical | SimulationModel::ImpBiasResampling => {
            // Imp/Bias Simulation
            // Default: Imp 0-33.3%, Bias -35 to 35%, Step 1%
            let max_imp = config.max_imprecision.unwrap_or(33.3);
            let max_bias = config.max_bias.unwrap_or(35.0);
            let step = config.step_size_imp_bias.unwrap_or(1.0);
            
            let step_frac = step / 100.0;
            
            let num_steps_imp = (max_imp / step).round() as i32;
            let num_steps_bias = (max_bias / step).round() as i32;
            
            let e: Vec<f64> = (0..=num_steps_imp).map(|i| i as f64 * step_frac).collect();
            // Bias range: -max to +max
            let f: Vec<f64> = (-num_steps_bias..=num_steps_bias).map(|i| i as f64 * step_frac).collect();
            
            (e, f)
        }
    };

    let total_steps = e_steps.len() * f_steps.len();
    let progress_counter = Arc::new(Mutex::new(0));

    // 5. Run Simulation (Parallel)
    let mu_data: Vec<SimulationPoint> = e_steps.par_iter().flat_map(|&e| {
        f_steps.par_iter().map(|&f| {
            // Update progress
            if let Some(handle) = app_handle {
                let mut cnt = progress_counter.lock().unwrap();
                *cnt += 1;
                if *cnt % 50 == 0 || *cnt == total_steps { // Update less frequently to avoid flooding
                    let _ = handle.emit("simulation-progress", *cnt as f64 / total_steps as f64 * 100.0);
                }
            }

            let mut total_agreement = 0.0;
            let mut total_sensitivity = 0.0;
            let mut total_specificity = 0.0;
            
            let mut sub_agreement = vec![0.0; names.len()];
            let mut sub_sensitivity = vec![0.0; names.len()];
            let mut sub_specificity = vec![0.0; names.len()];

            // Run 10 seeds
            for s in 1..=10 {
                let mut rng = StdRng::seed_from_u64(s + 1234);
                let noise: Vec<f64> = (0..data.len())
                    .map(|_| rng.sample::<f64, _>(StandardNormal))
                    .collect();

                let mut pred_cats = Vec::with_capacity(data.len());

                // Calculate Total CV based on model
                let total_cv = match model {
                    SimulationModel::MuResampling | SimulationModel::ImpBiasResampling => {
                        let cvi = config.cv_i.unwrap_or(0.0) / 100.0;
                        (e.powi(2) + cvi.powi(2)).sqrt()
                    },
                    _ => e
                };

                for (i, &val) in data.iter().enumerate() {
                    // y_od = result_t1 * (1 + imprec * total_cv)
                    let y_od = val * (1.0 + noise[i] * total_cv);
                    
                    // nd = y_od + val * f (Bias applied to original value in Python code: nd = y_od + result_t1*f)
                    let nd = y_od + val * f;

                    let nd_rounded = round_to(nd, config.decimal_places);
                    pred_cats.push(categorize(nd_rounded, &bins, &names));
                }

                // Confusion Matrix
                let mut cm = vec![vec![0; names.len()]; names.len()];
                for (true_cat, pred_cat) in original_cats.iter().zip(pred_cats.iter()) {
                    cm[*true_cat][*pred_cat] += 1;
                }

                // Calculate Metrics for this seed
                let total_samples = data.len();
                let tp_total: usize = (0..names.len()).map(|i| cm[i][i]).sum();
                total_agreement += tp_total as f64 / total_samples as f64;

                // Micro-average Sensitivity/Specificity (as per Python code)
                total_sensitivity += tp_total as f64 / total_samples as f64; // Micro Sens = Accuracy

                // Specificity
                // TN = Total - TP - FN - FP.
                // For micro:
                // TP_total = sum(diag).
                // FN_total = sum(all) - TP_total.
                // FP_total = sum(all) - TP_total.
                // TN_total = sum(TN_i) ? No.
                // Python: 
                // TP = np.diag(cm)
                // FN = sum(axis=1) - TP
                // FP = sum(axis=0) - TP
                // TN = sum(cm) - TP - FN - FP.
                // This formula calculates TN for *each class* then sums them?
                // Python: overall_specificity = np.sum(TN) / np.sum(TN + FP)
                
                let mut sum_tn = 0;
                let mut sum_fp = 0;
                
                for i in 0..names.len() {
                    let tp = cm[i][i];
                    let fn_ = (0..names.len()).map(|j| cm[i][j]).sum::<usize>() - tp;
                    let fp = (0..names.len()).map(|j| cm[j][i]).sum::<usize>() - tp;
                    let tn = total_samples - tp - fn_ - fp;
                    
                    sum_tn += tn;
                    sum_fp += fp;

                    // Sublevel metrics
                    // Accuracy (Subclass)
                    // accuracy = (TP+TN)/(TP+FP+FN+TN) = (TP+TN)/Total
                    sub_agreement[i] += (tp + tn) as f64 / total_samples as f64;

                    // Sensitivity (Subclass)
                    // TP / (TP+FN)
                    sub_sensitivity[i] += if tp + fn_ > 0 { tp as f64 / (tp + fn_) as f64 } else { 0.0 };

                    // Specificity (Subclass)
                    // TN / (TN+FP)
                    sub_specificity[i] += if tn + fp > 0 { tn as f64 / (tn + fp) as f64 } else { 0.0 };
                }
                
                total_specificity += if sum_tn + sum_fp > 0 { sum_tn as f64 / (sum_tn + sum_fp) as f64 } else { 0.0 };
            }

            // Average over 10 seeds
            let avg_agreement = total_agreement / 10.0;
            let avg_sensitivity = total_sensitivity / 10.0;
            let avg_specificity = total_specificity / 10.0;
            
            let avg_sub_agreement: Vec<f64> = sub_agreement.iter().map(|x| x / 10.0).collect();
            let avg_sub_sensitivity: Vec<f64> = sub_sensitivity.iter().map(|x| x / 10.0).collect();
            let avg_sub_specificity: Vec<f64> = sub_specificity.iter().map(|x| x / 10.0).collect();

            // Determine Categories
            let get_cat = |val: f64| -> String {
                let val_pct = val * 100.0;
                if val_pct >= config.agreement_thresholds.opt {
                    format!("≥{}%", config.agreement_thresholds.opt)
                } else if val_pct >= config.agreement_thresholds.des {
                    format!("≥{}%", config.agreement_thresholds.des)
                } else if val_pct >= config.agreement_thresholds.min {
                    format!("≥{}%", config.agreement_thresholds.min)
                } else {
                    format!("<{}%", config.agreement_thresholds.min)
                }
            };

            SimulationPoint {
                mu: e,
                bias: f,
                agreement: avg_agreement,
                sensitivity: avg_sensitivity,
                specificity: avg_specificity,
                agreement_cat: get_cat(avg_agreement),
                sensitivity_cat: get_cat(avg_sensitivity),
                specificity_cat: get_cat(avg_specificity),
                sublevel_agreement: avg_sub_agreement,
                sublevel_sensitivity: avg_sub_sensitivity,
                sublevel_specificity: avg_sub_specificity,
            }
        }).collect::<Vec<_>>()
    }).collect();

    SimulationResult {
        mu_data,
        names,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simulation_run() {
        let config = SimulationConfig {
            model: "Setting APS for measurement uncertainty - Analytical rerun simulation".to_string(),
            data: vec![100.0, 102.0, 98.0, 101.0, 99.0],
            cdls: vec![100.0],
            decimal_places: 0,
            agreement_thresholds: AgreementThresholds { min: 90.0, des: 95.0, opt: 99.0 },
            cv_i: None,
            sample_size: None,
        };

        let output = run_simulation(config, None);
        assert!(!output.mu_data.is_empty());
        
        let zero_point = output.mu_data.iter().find(|p| p.mu == 0.0 && p.bias.abs() < 1e-10).unwrap();
        assert_eq!(zero_point.agreement, 1.0);
    }
}
