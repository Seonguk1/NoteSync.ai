# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_submodules

hiddenimports = ['google.genai', 'groq', 'app', 'app.main']
hiddenimports += collect_submodules('app')


a = Analysis(
    ['C:\\Users\\82108\\Desktop\\projects\\NoteSync.ai\\backend\\run_server.py'],
    pathex=['C:\\Users\\82108\\Desktop\\projects\\NoteSync.ai\\backend'],
    binaries=[],
    datas=[('C:\\Users\\82108\\Desktop\\projects\\NoteSync.ai\\backend\\data', 'data')],
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='notesync-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
