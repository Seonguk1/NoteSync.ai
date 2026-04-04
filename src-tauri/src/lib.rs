// src-tauri/src/lib.rs
use tauri_plugin_shell::ShellExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let shell = app.shell();
            let sidecar_command = shell.sidecar("api")
                .map_err(|e| println!("사이드카 설정 실패: {}", e))
                .ok();

            if let Some(cmd) = sidecar_command {
                match cmd.spawn() {
                    Ok((_rx, _child)) => {
                        println!("✅ FastAPI 백엔드가 성공적으로 실행되었습니다.");
                    }
                    Err(e) => eprintln!("❌ FastAPI 실행 실패: {}", e),
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}