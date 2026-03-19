# backend/scripts/cleanup_storage.py

import sys
import argparse
from pathlib import Path

# 💡 스크립트가 'scripts' 폴더 안에서 실행되더라도 'app' 모듈을 찾을 수 있게 경로를 추가해 줍니다.
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
sys.path.append(str(backend_dir))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.db.models import BoardAsset

def run_cleanup(dry_run: bool = True):
    db = SessionLocal()
    # 실제 파일이 저장되는 최상위 경로 설정
    upload_root = backend_dir / ".uploads"
    
    print(f"🔍 스토리지 검사를 시작합니다... (대상: {upload_root})")
    if dry_run:
        print("🚨 [DRY RUN 모드] 실제 파일은 삭제되지 않고 목록만 출력됩니다.\n")
    else:
        print("⚠️ [실행 모드] 조건에 맞는 파일이 물리적으로 영구 삭제됩니다!\n")

    # 1. DB에서 살아있는 storage_key (예: "media/abc.mp3") 모두 가져오기
    try:
        valid_keys = set(db.scalars(select(BoardAsset.storage_key)).all())
        print(f"✅ DB에서 확인된 유효한 파일 개수: {len(valid_keys)}개")
    except Exception as e:
        print(f"❌ DB 조회 중 에러가 발생했습니다: {e}")
        db.close()
        return

    # 2. 고아 파일(Orphan Files) 찾기
    orphans = []
    total_freed_bytes = 0

    for folder_name in ["media", "pdf"]:
        folder_path = upload_root / folder_name
        print(f"\n📂 '{folder_name}' 폴더를 검사 중입니다... (경로: {folder_path})")
        if not folder_path.exists():
            continue

        for file_path in folder_path.glob("*"):
            if file_path.is_file():
                print(f"[DEBUG] 파일 발견: {file_path.name} (경로: {file_path})")
                
                # DB에 저장된 storage_key 형태와 똑같이 문자열을 맞춰줍니다.
                relative_key = f"{folder_name}/{file_path.name}"
                print(f"[DEBUG] 파일 키: {relative_key}")
                
                # DB 목록에 이 파일이 없다면? -> 삭제 대상!
                if relative_key not in valid_keys:
                    orphans.append(file_path)
                    total_freed_bytes += file_path.stat().st_size

    # 3. 결과 출력 및 삭제 처리
    if not orphans:
        print("\n✨ 완벽합니다! 삭제할 더미 파일이 없습니다.")
        db.close()
        return

    print(f"\n🗑️ 발견된 쓰레기 파일 목록 (총 {len(orphans)}개):")
    for orphan in orphans:
        size_mb = orphan.stat().st_size / (1024 * 1024)
        print(f"  - {orphan.relative_to(backend_dir)} ({size_mb:.2f} MB)")

    total_mb = total_freed_bytes / (1024 * 1024)
    print(f"\n📊 총 확보 가능한 용량: {total_mb:.2f} MB")

    # 4. Dry Run이 아닐 때만 실제 삭제 수행
    if not dry_run:
        print("\n🔥 파일 삭제를 시작합니다...")
        deleted_count = 0
        for orphan in orphans:
            try:
                orphan.unlink() # 실제 파일 삭제 명령어
                deleted_count += 1
            except Exception as e:
                print(f"  ❌ 삭제 실패 ({orphan.name}): {e}")
        print(f"✅ 총 {deleted_count}개의 파일을 영구 삭제했습니다.")
    else:
        print("\n💡 실제 삭제를 원하시면 명령어 뒤에 '--execute' 플래그를 붙여서 실행하세요.")

    db.close()

if __name__ == "__main__":
    # 터미널 명령어 인자(Argument)를 파싱하는 설정입니다.
    parser = argparse.ArgumentParser(description="미사용 스토리지 파일 정리 스크립트")
    parser.add_argument("--execute", action="store_true", help="이 플래그를 넣으면 실제로 파일을 삭제합니다.")
    args = parser.parse_args()

    # --execute 플래그가 있으면 dry_run은 False가 됩니다.
    run_cleanup(dry_run=not args.execute)