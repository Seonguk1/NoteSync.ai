import { MoreHorizontal } from "lucide-react";
import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

// EntityRow 컴포넌트: 각 항목별 렌더링 및 드롭다운 메뉴 관리
export function EntityRow<T extends { id: number; name: string }>(
  {
    entity,
    item,
    isSelected,
    isMenuOpen,
    setOpenMenu,
    onSelect,
    onRename,
    onDelete
  }: {
    entity: "term" | "course" | "session";
    item: T;
    isSelected: boolean;
    isMenuOpen: boolean;
    setOpenMenu: (value: { entity: "term" | "course" | "session"; id: number } | null) => void;
    onSelect: (id: number) => void;
    onRename: (item: T) => void;
    onDelete: (item: T) => void;
    // openMenu prop 제거
  }
) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useLayoutEffect(() => {
    if (isMenuOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuHeight = 90; // 예상 메뉴 높이(px)
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight;
      setMenuPos({
        top: openUp ? rect.top - menuHeight : rect.bottom + 4,
        left: rect.right - 128, // 메뉴 width 128px
        openUp,
      });
    }
  }, [isMenuOpen]);

  return (
    <div
      key={item.id}
      className="relative"
      data-session-menu-root="true"
    >
      <button
        type="button"
        onClick={() => {
          setOpenMenu(null);
          onSelect(item.id);
        }}
        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
          isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
        }`}
      >
        <span className="truncate pr-8 text-sm font-medium">{item.name}</span>
      </button>

      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenu(isMenuOpen ? null : { entity, id: item.id });
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        aria-label="더보기"
        data-session-menu-root="true"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isMenuOpen && menuPos && createPortal(
        <div
          className="z-[9999] w-32 rounded-xl border border-gray-200 bg-white p-1 shadow-lg fixed"
          style={{
            top: menuPos.top,
            left: menuPos.left,
          }}
          data-session-menu-root="true"
        >
          <button
            type="button"
            onClick={() => {
              onRename(item);
              setOpenMenu(null);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            이름 변경
          </button>

          <button
            type="button"
            onClick={() => {
              onDelete(item);
              setOpenMenu(null);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
          >
            삭제
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
