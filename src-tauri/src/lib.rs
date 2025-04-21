use std::collections::HashMap;
use std::path::Path;
use std::fs;
use std::io::Read;
use base64::{Engine as _, engine::general_purpose};
use serde::{Serialize, Deserialize};
use reqwest::header::{HeaderMap, HeaderValue};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    path: String,
    name: String,
    is_dir: bool,
    size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryContents {
    files: Vec<FileInfo>,
    image_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    os: String,
    cpu_cores: usize,
    memory_mb: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnthropicRequest {
    model: String,
    messages: Vec<serde_json::Value>,
    max_tokens: u32,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnthropicResponse {
    content: String,
    error: Option<String>,
}

// Get system information
#[tauri::command]
fn get_system_info() -> SystemInfo {
    let os = std::env::consts::OS.to_string();
    let cpu_cores = num_cpus::get();
    
    // This is a simplified approach - in a real app you'd use a crate like sysinfo
    // to get accurate memory information
    let memory_mb = 16384; // Placeholder value
    
    SystemInfo {
        os,
        cpu_cores,
        memory_mb,
    }
}

// Get directory contents with optimized file info
#[tauri::command]
fn get_directory_contents(path: &str) -> Result<DirectoryContents, String> {
    let dir_path = Path::new(path);
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err(format!("Directory not found: {}", path));
    }
    
    let entries = match fs::read_dir(dir_path) {
        Ok(entries) => entries,
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    };
    
    let mut files = Vec::new();
    let mut image_count = 0;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path_buf = entry.path();
            let is_dir = path_buf.is_dir();
            let path_str = path_buf.to_string_lossy().to_string();
            
            let name = match path_buf.file_name() {
                Some(name) => name.to_string_lossy().to_string(),
                None => continue,
            };
            
            let size = if is_dir {
                0
            } else {
                match entry.metadata() {
                    Ok(metadata) => metadata.len(),
                    Err(_) => 0,
                }
            };
            
            // Check if it's an image file
            if !is_dir {
                if let Some(ext) = path_buf.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "jpg" || ext_str == "jpeg" || ext_str == "png" {
                        image_count += 1;
                    }
                }
            }
            
            files.push(FileInfo {
                path: path_str,
                name,
                is_dir,
                size,
            });
        }
    }
    
    // Sort files: directories first, then by name
    files.sort_by(|a, b| {
        if a.is_dir && !b.is_dir {
            std::cmp::Ordering::Less
        } else if !a.is_dir && b.is_dir {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    
    Ok(DirectoryContents {
        files,
        image_count,
    })
}

// Fallback directory selection function
#[tauri::command]
fn select_directory_fallback() -> Result<String, String> {
    // Since we can't use the FileDialogBuilder directly, we'll return an error
    // and let the frontend handle it
    Err("Native directory selection not available".to_string())
}

// Batch process captions - save multiple captions at once
#[tauri::command]
fn save_captions(captions: HashMap<String, String>) -> Result<usize, String> {
    let mut success_count = 0;
    
    for (path, caption) in captions {
        let path = Path::new(&path);
        
        // Skip if the path doesn't exist
        if !path.exists() {
            continue;
        }
        
        // Get the caption file path (same name but .txt extension)
        let file_stem = match path.file_stem() {
            Some(stem) => stem.to_string_lossy().to_string(),
            None => continue,
        };
        
        let parent = match path.parent() {
            Some(parent) => parent,
            None => continue,
        };
        
        let caption_path = parent.join(format!("{}.txt", file_stem));
        
        // Write the caption to the file
        if let Err(_) = fs::write(&caption_path, caption) {
            continue;
        }
        
        success_count += 1;
    }
    
    Ok(success_count)
}

use image::io::Reader as ImageReader;
use image::GenericImageView;


// Read an image file and return its contents as a base64-encoded string, with validation
#[tauri::command]
fn read_image_as_base64(path: &str) -> Result<String, String> {
    let path = Path::new(path);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    // Open the image file and always use with_guessed_format()
    let mut img_reader = match image::io::Reader::open(path)
        .and_then(|r| r.with_guessed_format()) {
        Ok(reader) => reader,
        Err(e) => return Err(format!("Failed to open or guess image format: {}", e)),
    };

    // Decode the image for validation
    let img = match img_reader.decode() {
        Ok(img) => img,
        Err(e) => return Err(format!("Failed to decode image: {}", e)),
    };

    let (width, height) = img.dimensions();

    // Check size constraints (Anthropic: max 8000x8000, recommend <=1568px, min 200px)
    if width > 8000 || height > 8000 {
        return Err(format!(
            "Image dimensions too large: {}x{} (max 8000x8000 px)",
            width, height
        ));
    }
    if width < 200 || height < 200 {
        return Err(format!(
            "Image dimensions too small: {}x{} (min 200x200 px)",
            width, height
        ));
    }

    // Re-read the file as bytes for base64 encoding (to preserve original format)
    let mut file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to open file: {}", e)),
    };

    let mut buffer = Vec::new();
    if let Err(e) = file.read_to_end(&mut buffer) {
        return Err(format!("Failed to read file: {}", e));
    }

    // Encode the file contents as base64
    let base64_string = general_purpose::STANDARD.encode(&buffer);

    Ok(base64_string)
}

// Read an image file and return its contents as a base64-encoded string, with validation and detected media type (for Anthropic)
#[tauri::command]
fn read_image_as_base64_with_type(path: &str) -> Result<String, String> {
    let path = Path::new(path);

    // Check if the file exists
    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    // Open the image file and always use with_guessed_format()
    let mut img_reader = match image::io::Reader::open(path)
        .and_then(|r| r.with_guessed_format()) {
        Ok(reader) => reader,
        Err(e) => return Err(format!("Failed to open or guess image format: {}", e)),
    };

    // Get the format
    let format = match img_reader.format() {
        Some(fmt) => fmt,
        None => return Err("Failed to determine image format".to_string()),
    };

    // Decode the image for validation
    let img = match img_reader.decode() {
        Ok(img) => img,
        Err(e) => return Err(format!("Failed to decode image: {}", e)),
    };

    let (width, height) = img.dimensions();

    // Check size constraints (Anthropic: max 8000x8000, recommend <=1568px, min 200px)
    if width > 8000 || height > 8000 {
        return Err(format!(
            "Image dimensions too large: {}x{} (max 8000x8000 px)",
            width, height
        ));
    }
    if width < 200 || height < 200 {
        return Err(format!(
            "Image dimensions too small: {}x{} (min 200x200 px)",
            width, height
        ));
    }

    // Re-read the file as bytes for base64 encoding (to preserve original format)
    let mut file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to open file: {}", e)),
    };

    let mut buffer = Vec::new();
    if let Err(e) = file.read_to_end(&mut buffer) {
        return Err(format!("Failed to read file: {}", e));
    }

    // Encode the file contents as base64
    let base64_string = general_purpose::STANDARD.encode(&buffer);

    // Map image::ImageFormat to MIME type
    let media_type = match format {
        image::ImageFormat::Jpeg => "image/jpeg",
        image::ImageFormat::Png => "image/png",
        image::ImageFormat::Gif => "image/gif",
        image::ImageFormat::WebP => "image/webp",
        image::ImageFormat::Bmp => "image/bmp",
        image::ImageFormat::Tiff => "image/tiff",
        image::ImageFormat::Avif => "image/avif",
        image::ImageFormat::Pnm => "image/x-portable-anymap",
        image::ImageFormat::Tga => "image/x-tga",
        image::ImageFormat::Dds => "image/vnd.ms-dds",
        image::ImageFormat::Ico => "image/x-icon",
        image::ImageFormat::Hdr => "image/vnd.radiance",
        image::ImageFormat::Farbfeld => "image/farbfeld",
        _ => "application/octet-stream",
    };

    // Return as JSON string
    let result = serde_json::json!({
        "base64Data": base64_string,
        "mediaType": media_type
    });

    Ok(result.to_string())
}

// Create directory in AppData with elevated permissions
#[tauri::command]
fn create_app_data_dir(path: &str) -> Result<bool, String> {
    // Check if the directory already exists
    let path_obj = Path::new(path);
    if path_obj.exists() {
        println!("Directory already exists: {}", path);
        return Ok(true);
    }
    
    // Ensure parent directory exists
    if let Some(parent) = path_obj.parent() {
        if !parent.exists() {
            println!("Creating parent directory: {}", parent.display());
            if let Err(e) = fs::create_dir_all(parent) {
                println!("Failed to create parent directory {}: {}", parent.display(), e);
                return Err(format!("Failed to create parent directory: {}", e));
            }
        }
    }
    
    // Try to create the directory
    match fs::create_dir(path) {
        Ok(_) => {
            println!("Successfully created directory: {}", path);
            Ok(true)
        },
        Err(e) => {
            // If the error is that the directory already exists, that's fine
            if e.kind() == std::io::ErrorKind::AlreadyExists {
                println!("Directory already exists (race condition): {}", path);
                Ok(true)
            } else {
                println!("Failed to create directory {}: {}", path, e);
                Err(format!("Failed to create directory: {}", e))
            }
        }
    }
}

use reqwest::Client;

// Proxy request to Ollama API
#[tauri::command]
async fn proxy_ollama_request(endpoint: String, request_data: String) -> Result<String, String> {
    // endpoint: e.g. "generate" or "tags"
    // request_data: JSON string for POST body (for generate), or empty for GET (for tags)
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("http://127.0.0.1:11434/api/{}", endpoint);

    let response = if endpoint == "tags" {
        // GET request for /api/tags
        client.get(&url)
            .send()
            .await
            .map_err(|e| format!("Failed to send GET request: {}", e))?
    } else {
        // POST request for /api/generate and others
        client.post(&url)
            .header("Content-Type", "application/json")
            .body(request_data)
            .send()
            .await
            .map_err(|e| format!("Failed to send POST request: {}", e))?
    };

    let status = response.status();
    let body = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if !status.is_success() {
        return Err(format!("Ollama API request failed with status {}: {}", status, body));
    }

    Ok(body)
}

// Proxy request to Anthropic API
#[tauri::command]
async fn proxy_anthropic_request(api_key: String, request_data: String) -> Result<String, String> {
    println!("Proxying request to Anthropic API");
    
    // Create a client with custom timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Create headers
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", HeaderValue::from_static("application/json"));
    headers.insert("x-api-key", HeaderValue::from_str(&api_key).map_err(|e| format!("Invalid API key: {}", e))?);
    headers.insert("anthropic-version", HeaderValue::from_static("2023-06-01"));
    
    // Parse the request data to fix any base64 encoding issues
    let mut request_obj: serde_json::Value = match serde_json::from_str(&request_data) {
        Ok(obj) => obj,
        Err(e) => {
            println!("Error parsing request JSON: {}", e);
            return Err(format!("Invalid JSON: {}", e));
        }
    };
    
    // Check if we need to fix the base64 data
    if let Some(messages) = request_obj.get_mut("messages").and_then(|m| m.as_array_mut()) {
        if let Some(message) = messages.get_mut(0) {
            if let Some(content) = message.get_mut("content").and_then(|c| c.as_array_mut()) {
                for item in content.iter_mut() {
                    if let Some(image_type) = item.get("type").and_then(|t| t.as_str()) {
                        if image_type == "image" {
                            if let Some(source) = item.get_mut("source") {
                                if let Some(source_type) = source.get("type").and_then(|t| t.as_str()) {
                                    if source_type == "base64" {
                                        if let Some(data) = source.get_mut("data").and_then(|d| d.as_str()) {
                                            // Ensure the base64 data is properly formatted
                                            // Remove any whitespace, brackets, quotes, or other non-base64 characters
                                            let mut clean_data = data.replace("\n", "").replace("\r", "").replace(" ", "");
                                            
                                            // Remove any potential JSON artifacts like brackets or quotes
                                            if clean_data.starts_with("[") && clean_data.ends_with("]") {
                                                clean_data = clean_data[1..clean_data.len()-1].to_string();
                                            }
                                            if clean_data.starts_with("\"") && clean_data.ends_with("\"") {
                                                clean_data = clean_data[1..clean_data.len()-1].to_string();
                                            }
                                            
                                            // Remove any other non-base64 characters
                                            clean_data = clean_data.chars()
                                                .filter(|c| c.is_ascii_alphanumeric() || *c == '+' || *c == '/' || *c == '=')
                                                .collect();

                                            // Log media type if available
                                            if let Some(media_type) = source.get("media_type").and_then(|m| m.as_str()) {
                                                println!("Anthropic proxy: media_type = {}", media_type);
                                            }
                                            // Log first and last 20 chars of base64
                                            let len = clean_data.len();
                                            let first20 = &clean_data.chars().take(20).collect::<String>();
                                            let last20 = if len > 20 {
                                                &clean_data.chars().rev().take(20).collect::<String>().chars().rev().collect::<String>()
                                            } else {
                                                ""
                                            };
                                            println!("Anthropic proxy: base64 first 20: {}", first20);
                                            println!("Anthropic proxy: base64 last 20: {}", last20);
                                            println!("Anthropic proxy: base64 length: {}", len);

                                            // Decode and log first 16 bytes in hex
                                            match base64::engine::general_purpose::STANDARD.decode(&clean_data) {
                                                Ok(decoded) => {
                                                    let hex_bytes: Vec<String> = decoded.iter().take(16).map(|b| format!("{:02X}", b)).collect();
                                                    println!("Anthropic proxy: decoded first 16 bytes: {}", hex_bytes.join(" "));
                                                    // Optionally: comment out re-encoding and just use cleaned base64
                                                    // let reencoded = base64::engine::general_purpose::STANDARD.encode(&decoded);
                                                    // if let Some(data_field) = source.get_mut("data") {
                                                    //     *data_field = serde_json::Value::String(reencoded);
                                                    //     println!("Re-encoded base64 data");
                                                    // }
                                                    // Instead, just use cleaned base64
                                                    if let Some(data_field) = source.get_mut("data") {
                                                        *data_field = serde_json::Value::String(clean_data.clone());
                                                        println!("Set cleaned base64 data (no re-encode)");
                                                    }
                                                },
                                                Err(e) => {
                                                    println!("Error decoding base64: {}", e);
                                                    return Err(format!("Invalid base64 data: {}", e));
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Convert back to string
    let fixed_request_data = match serde_json::to_string(&request_obj) {
        Ok(data) => data,
        Err(e) => {
            println!("Error serializing fixed request: {}", e);
            return Err(format!("Failed to serialize request: {}", e));
        }
    };
    
    println!("Making request to Anthropic API");
    
    // Make the request
    let response = match client.post("https://api.anthropic.com/v1/messages")
        .headers(headers)
        .body(fixed_request_data)
        .send()
        .await {
            Ok(resp) => resp,
            Err(e) => {
                println!("Error making request: {}", e);
                if e.is_timeout() {
                    return Err(format!("Request timed out: {}", e));
                } else if e.is_connect() {
                    return Err(format!("Connection error: {}", e));
                } else {
                    return Err(format!("Request failed: {}", e));
                }
            }
        };
    
    // Get the response status
    let status = response.status();
    println!("Received response with status: {}", status);
    
    // Get the response body
    let body = match response.text().await {
        Ok(text) => text,
        Err(e) => {
            println!("Error reading response body: {}", e);
            return Err(format!("Failed to read response: {}", e));
        }
    };
    
    // Check if the request was successful
    if !status.is_success() {
        println!("API request failed with status {}: {}", status, body);
        return Err(format!("API request failed with status {}: {}", status, body));
    }
    
    println!("Successfully received response from Anthropic API");
    Ok(body)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Store plugin removed as we're using localStorage instead
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_directory_contents,
            save_captions,
            select_directory_fallback,
            read_image_as_base64,
            read_image_as_base64_with_type,
            create_app_data_dir,
            proxy_ollama_request,
            proxy_anthropic_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
