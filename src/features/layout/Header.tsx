// src/features/layout/Header.tsx

import { ChevronRight, LayoutDashboard } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export const Header = () => {
  const currentSessionPath = useAppStore((state) => state.currentSessionPath);
  const openSessionModal = useAppStore((state) => state.openSessionModal);

  const hasSession = !!currentSessionPath;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <LayoutDashboard className="w-5 h-5 text-blue-600 mr-2" />
        </div>
        <h1 className="font-bold text-gray-700 tracking-wide mr-10">
          NoteSync<span className="text-blue-600">.ai</span>
        </h1>

        <button
          type="button"
          onClick={openSessionModal}
          className="min-w-0 rounded-lg px-2 py-1 text-left transition-colors hover:bg-gray-50"
        >
          {hasSession ? (
            <div className="flex min-w-0 items-center gap-1 text-sm font-medium text-gray-700">
              <span className="truncate">{currentSessionPath.termName}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              <span className="truncate">{currentSessionPath.courseName}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              <span className="truncate text-blue-600">
                {currentSessionPath.sessionName}
              </span>
            </div>
          ) : (
            <div className="text-sm font-medium text-gray-500">
              학습할 세션을 선택해주세요
            </div>
          )}
        </button>
      </div>
    </header>
  );
};