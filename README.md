
```
NoteSync.ai
├─ backend
│  ├─ api.spec
│  ├─ app
│  │  ├─ api
│  │  │  ├─ v1
│  │  │  │  ├─ academic.py
│  │  │  │  ├─ content.py
│  │  │  │  ├─ router.py
│  │  │  │  └─ __init__.py
│  │  │  └─ __init__.py
│  │  ├─ database.py
│  │  ├─ main.py
│  │  ├─ models
│  │  │  ├─ annotation.py
│  │  │  ├─ course.py
│  │  │  ├─ keyword.py
│  │  │  ├─ material.py
│  │  │  ├─ note.py
│  │  │  ├─ session.py
│  │  │  ├─ term.py
│  │  │  ├─ transcript.py
│  │  │  └─ __init__.py
│  │  ├─ orchestrator.py
│  │  ├─ schemas
│  │  │  ├─ academic.py
│  │  │  ├─ content.py
│  │  │  └─ __init__.py
│  │  ├─ services
│  │  │  ├─ ai
│  │  │  │  ├─ clients.py
│  │  │  │  ├─ keywords.py
│  │  │  │  ├─ refine.py
│  │  │  │  ├─ stt.py
│  │  │  │  └─ __init__.py
│  │  │  ├─ media
│  │  │  │  ├─ audio_service.py
│  │  │  │  └─ pdf_service.py
│  │  │  └─ subtitle
│  │  │     ├─ filter_service.py
│  │  │     └─ normalize_service.py
│  │  └─ __init__.py
│  ├─ build
│  │  ├─ api
│  │  │  ├─ Analysis-00.toc
│  │  │  ├─ api.pkg
│  │  │  ├─ base_library.zip
│  │  │  ├─ EXE-00.toc
│  │  │  ├─ localpycs
│  │  │  ├─ PKG-00.toc
│  │  │  ├─ PYZ-00.pyz
│  │  │  ├─ PYZ-00.toc
│  │  │  ├─ warn-api.txt
│  │  │  └─ xref-api.html
│  │  ├─ main
│  │  │  ├─ Analysis-00.toc
│  │  │  ├─ base_library.zip
│  │  │  ├─ EXE-00.toc
│  │  │  ├─ localpycs
│  │  │  ├─ main.pkg
│  │  │  ├─ PKG-00.toc
│  │  │  ├─ PYZ-00.pyz
│  │  │  ├─ PYZ-00.toc
│  │  │  ├─ warn-main.txt
│  │  │  └─ xref-main.html
│  │  ├─ notesync-backend
│  │  │  ├─ Analysis-00.toc
│  │  │  ├─ base_library.zip
│  │  │  ├─ EXE-00.toc
│  │  │  ├─ localpycs
│  │  │  ├─ notesync-backend.pkg
│  │  │  ├─ PKG-00.toc
│  │  │  ├─ PYZ-00.pyz
│  │  │  ├─ PYZ-00.toc
│  │  │  ├─ warn-notesync-backend.txt
│  │  │  └─ xref-notesync-backend.html
│  │  └─ notesync-config
│  │     ├─ Analysis-00.toc
│  │     ├─ base_library.zip
│  │     ├─ EXE-00.toc
│  │     ├─ localpycs
│  │     ├─ notesync-config.pkg
│  │     ├─ PKG-00.toc
│  │     ├─ PYZ-00.pyz
│  │     ├─ PYZ-00.toc
│  │     ├─ warn-notesync-config.txt
│  │     └─ xref-notesync-config.html
│  ├─ build_sidecar.py
│  ├─ FFMPEG.md
│  ├─ main.spec
│  ├─ requirements.txt
│  ├─ run.py
│  ├─ spec
│  │  ├─ notesync-backend.spec
│  │  └─ notesync-config.spec
│  ├─ test_audio.mp3
│  ├─ test_doc.pdf
│  └─ upx.exe
├─ index.html
├─ package-lock.json
├─ package.json
├─ public
│  ├─ tauri.svg
│  └─ vite.svg
├─ README.md
├─ src
│  ├─ api
│  │  ├─ academic.ts
│  │  ├─ client.ts
│  │  └─ content.ts
│  ├─ App.tsx
│  ├─ assets
│  │  └─ react.svg
│  ├─ components
│  │  ├─ session-modal
│  │  │  ├─ EntityColumn.tsx
│  │  │  ├─ EntityNameModal.tsx
│  │  │  ├─ EntityRow.tsx
│  │  │  └─ useSessionModalState.ts
│  │  ├─ SessionModal.tsx
│  │  └─ UploadModal.tsx
│  ├─ features
│  │  ├─ layout
│  │  │  └─ Header.tsx
│  │  ├─ player
│  │  │  └─ BottomPlayer.tsx
│  │  ├─ sidebar
│  │  │  ├─ components
│  │  │  │  ├─ CreateNoteModal.tsx
│  │  │  │  ├─ MaterialSection.tsx
│  │  │  │  ├─ RenameMaterialModal.tsx
│  │  │  │  └─ UploadMaterialModal.tsx
│  │  │  └─ Sidebar.tsx
│  │  ├─ transcript
│  │  │  ├─ components
│  │  │  │  └─ TranscriptOverlay.tsx
│  │  │  └─ TranscriptViewer.tsx
│  │  └─ workspace
│  │     ├─ components
│  │     │  ├─ annotation
│  │     │  ├─ AnnotationLayer.tsx
│  │     │  ├─ MediaViewer.tsx
│  │     │  └─ PdfViewer.tsx
│  │     ├─ MaterialViewer.tsx
│  │     ├─ MemoEditor.tsx
│  │     ├─ Workspace.tsx
│  │     └─ WorkspaceShell.tsx
│  ├─ hooks
│  │  └─ usePolling.ts
│  ├─ index.css
│  ├─ main.tsx
│  ├─ store
│  │  └─ useAppStore.ts
│  └─ vite-env.d.ts
├─ src-tauri
│  ├─ binaries
│  │  └─ api-x86_64-pc-windows-msvc.exe
│  ├─ build.rs
│  ├─ bundle-resources
│  │  ├─ notesync-backend.exe
│  │  └─ notesync-config.exe
│  ├─ capabilities
│  │  └─ default.json
│  ├─ Cargo.lock
│  ├─ Cargo.toml
│  ├─ gen
│  │  └─ schemas
│  │     ├─ acl-manifests.json
│  │     ├─ capabilities.json
│  │     ├─ desktop-schema.json
│  │     └─ windows-schema.json
│  ├─ icons
│  │  ├─ 128x128.png
│  │  ├─ 128x128@2x.png
│  │  ├─ 32x32.png
│  │  ├─ icon.icns
│  │  ├─ icon.ico
│  │  ├─ icon.png
│  │  ├─ Square107x107Logo.png
│  │  ├─ Square142x142Logo.png
│  │  ├─ Square150x150Logo.png
│  │  ├─ Square284x284Logo.png
│  │  ├─ Square30x30Logo.png
│  │  ├─ Square310x310Logo.png
│  │  ├─ Square44x44Logo.png
│  │  ├─ Square71x71Logo.png
│  │  ├─ Square89x89Logo.png
│  │  └─ StoreLogo.png
│  ├─ src
│  │  ├─ lib.rs
│  │  └─ main.rs
│  └─ tauri.conf.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts

```