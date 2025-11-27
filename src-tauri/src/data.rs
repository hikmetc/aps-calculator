use std::path::Path;
use calamine::{Reader, Xlsx, open_workbook, Data, XlsxError};
use polars::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct FileData {
    pub columns: Vec<String>,
    pub row_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LoadedColumn {
    pub name: String,
    pub values: Vec<f64>,
}

pub fn read_excel_columns(path: &str) -> Result<Vec<String>, String> {
    let mut workbook: Xlsx<std::io::BufReader<std::fs::File>> = open_workbook(path).map_err(|e: XlsxError| e.to_string())?;
    
    // Assume first sheet
    let range = workbook.worksheet_range_at(0)
        .ok_or("No worksheets found")?
        .map_err(|e| e.to_string())?;

    if range.is_empty() {
        return Err("Empty worksheet".to_string());
    }

    // Read header row
    let mut columns = Vec::new();
    let mut rows = range.rows();
    
    if let Some(header_row) = rows.next() {
        for cell in header_row {
            columns.push(cell.to_string());
        }
    }

    Ok(columns)
}

pub fn read_csv_columns(path: &str) -> Result<Vec<String>, String> {
    let df = CsvReader::from_path(path)
        .map_err(|e| e.to_string())?
        .finish()
        .map_err(|e| e.to_string())?;
    
    Ok(df.get_column_names().iter().map(|s| s.to_string()).collect())
}

pub fn get_column_data(path: &str, column_name: &str) -> Result<Vec<f64>, String> {
    let path_obj = Path::new(path);
    let extension = path_obj.extension().and_then(|s| s.to_str()).unwrap_or("");

    match extension.to_lowercase().as_str() {
        "xlsx" | "xls" => {
            let mut workbook: Xlsx<std::io::BufReader<std::fs::File>> = open_workbook(path).map_err(|e: XlsxError| e.to_string())?;
            let range = workbook.worksheet_range_at(0)
                .ok_or("No worksheets found")?
                .map_err(|e| e.to_string())?;
            
            let mut col_idx = None;
            let mut rows = range.rows();
            
            // Find column index
            if let Some(header_row) = rows.next() {
                for (i, cell) in header_row.iter().enumerate() {
                    if cell.to_string() == column_name {
                        col_idx = Some(i);
                        break;
                    }
                }
            }

            let col_idx = col_idx.ok_or(format!("Column '{}' not found", column_name))?;
            let mut values = Vec::new();

            for row in rows {
                if let Some(cell) = row.get(col_idx) {
                    match cell {
                        Data::Float(f) => values.push(*f),
                        Data::Int(i) => values.push(*i as f64),
                        Data::String(s) => {
                            if let Ok(f) = s.parse::<f64>() {
                                values.push(f);
                            }
                        },
                        _ => {}
                    }
                }
            }
            Ok(values)
        },
        "csv" => {
            let df = CsvReader::from_path(path)
                .map_err(|e| e.to_string())?
                .finish()
                .map_err(|e| e.to_string())?;
            
            let series = df.column(column_name).map_err(|e| e.to_string())?;
            let ca = series.f64().map_err(|e| e.to_string())?;
            
            let values: Vec<f64> = ca.into_no_null_iter().collect();
            Ok(values)
        },
        _ => Err("Unsupported file format".to_string())
    }
}
