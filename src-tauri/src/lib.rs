

mod data;
mod simulation;

use data::{read_excel_columns, read_csv_columns, get_column_data};
use simulation::{run_simulation, SimulationConfig, SimulationResult};

#[tauri::command]
fn get_file_columns(path: String) -> Result<Vec<String>, String> {
    if path.ends_with(".csv") {
        read_csv_columns(&path)
    } else {
        read_excel_columns(&path)
    }
}



use tauri::Window;
use tauri::Manager; // Import Manager trait to use .app_handle()

#[tauri::command]
async fn run_simulation_async(config: SimulationConfig, window: Window) -> Result<SimulationResult, String> {
     // Offload to thread pool
     let result = tauri::async_runtime::spawn_blocking(move || {
        run_simulation(config, Some(window.app_handle()))
    }).await.map_err(|e| e.to_string())?;
    
    Ok(result)
}

#[tauri::command]
fn load_column_data(path: String, column: String) -> Result<Vec<f64>, String> {
    get_column_data(&path, &column)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_file_columns, 
            run_simulation_async,
            load_column_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
