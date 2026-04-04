import { useEffect } from "react";
import {
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useSessionModalState } from "./session-modal/useSessionModalState";
import { EntityColumn } from "./session-modal/EntityColumn";
import { EntityNameModal } from "./session-modal/EntityNameModal";


export const SessionModal = () => {
  const state = useSessionModalState();

  // ESC 키로 모달 닫기 (canClose일 때만 동작)
  useEffect(() => {
    if (!state.isSessionModalOpen || !state.canClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        state.closeSessionModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isSessionModalOpen, state.canClose, state.closeSessionModal]);

  useEffect(() => {
    if (!state.openMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-session-menu-root="true"]')) {
        return;
      }
      state.setOpenMenu(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [state.openMenu]);

  if (!state.isSessionModalOpen) return null;

  const handleClose = () => {
    if (!state.canClose) return;
    state.closeSessionModal();
  };

  const handleStart = () => {
    if (!state.selectedTerm || !state.selectedCourse || !state.selectedSession) return;
    state.setCurrentSession(state.selectedSession.id, {
      termName: state.selectedTerm.name,
      courseName: state.selectedCourse.name,
      sessionName: state.selectedSession.name,
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 px-4"
        onMouseDown={(e) => {
          if (!state.canClose) return;
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-gray-400">
                SESSION
              </p>
              <h2 className="text-lg font-semibold text-gray-800">
                학습 세션 선택 및 관리
              </h2>
            </div>

            {state.canClose && (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-5 px-6 py-6">
            {state.errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
                {state.errorMessage}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {/* EntityColumn은 리스트가 아니므로 key 문제 없음. 내부 map에서 key가 올바르게 부여되어 있는지 EntityColumn.tsx에서 점검 필요. */}
              {/* 아래는 구조상 문제 없음. 혹시라도 EntityColumn을 map으로 렌더링하는 경우 key를 꼭 부여해야 함. */}
              <EntityColumn
                entity="term"
                title="학기"
                items={state.terms}
                selectedId={state.selectedTermId}
                loading={state.isLoadingTerms}
                onSelect={(id) => {
                  state.setSelectedTermId(id);
                  state.setSelectedCourseId(null);
                  state.setSelectedSessionId(null);
                }}
                onCreate={() =>
                  state.setEditModal({
                    open: true,
                    mode: "create",
                    entity: "term",
                    targetId: null,
                    initialName: "",
                  })
                }
                openMenu={state.openMenu}
                setOpenMenu={state.setOpenMenu}
                onRename={(item) =>
                  state.setEditModal({
                    open: true,
                    mode: "rename",
                    entity: "term",
                    targetId: item.id,
                    initialName: item.name,
                  })
                }
                onDelete={(item) => state.handleDelete("term", item.id, item.name)}
              />
              <EntityColumn
                entity="course"
                title="강의"
                items={state.courses}
                selectedId={state.selectedCourseId}
                loading={state.isLoadingCourses}
                disabled={!state.selectedTermId}
                onSelect={(id) => {
                  state.setSelectedCourseId(id);
                  state.setSelectedSessionId(null);
                }}
                onCreate={() =>
                  state.setEditModal({
                    open: true,
                    mode: "create",
                    entity: "course",
                    targetId: null,
                    initialName: "",
                  })
                }
                openMenu={state.openMenu}
                setOpenMenu={state.setOpenMenu}
                onRename={(item) =>
                  state.setEditModal({
                    open: true,
                    mode: "rename",
                    entity: "course",
                    targetId: item.id,
                    initialName: item.name,
                  })
                }
                onDelete={(item) => state.handleDelete("course", item.id, item.name)}
              />
              <EntityColumn
                entity="session"
                title="세션"
                items={state.sessions}
                selectedId={state.selectedSessionId}
                loading={state.isLoadingSessions}
                disabled={!state.selectedCourseId}
                onSelect={(id) => state.setSelectedSessionId(id)}
                onCreate={() =>
                  state.setEditModal({
                    open: true,
                    mode: "create",
                    entity: "session",
                    targetId: null,
                    initialName: "",
                  })
                }
                openMenu={state.openMenu}
                setOpenMenu={state.setOpenMenu}
                onRename={(item) =>
                  state.setEditModal({
                    open: true,
                    mode: "rename",
                    entity: "session",
                    targetId: item.id,
                    initialName: item.name,
                  })
                }
                onDelete={(item) => state.handleDelete("session", item.id, item.name)}
              />
            </div>

            <div className="rounded-2xl bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold tracking-wide text-gray-400">
                선택된 경로
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1 text-sm font-medium text-gray-700">
                <span>{state.selectedTerm?.name ?? "학기 선택"}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
                <span>{state.selectedCourse?.name ?? "강의 선택"}</span>
                <ChevronRight className="h-4 w-4 text-gray-300" />
                <span className="text-blue-600">{state.selectedSession?.name ?? "세션 선택"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
            {state.canClose && (
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                취소
              </button>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={!state.selectedSessionId || state.isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  불러오는 중...
                </>
              ) : (
                "시작하기"
              )}
            </button>
          </div>
        </div>
      </div>

      <EntityNameModal
        open={state.editModal.open}
        mode={state.editModal.mode}
        entity={state.editModal.entity}
        initialName={state.editModal.initialName}
        onClose={() =>
          state.setEditModal((prev) => ({
            ...prev,
            open: false,
          }))
        }
        onSave={state.handleSaveEntity}
      />
    </>
  );
};