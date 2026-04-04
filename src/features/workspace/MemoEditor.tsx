// src/features/workspace/MemoEditor.tsx

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";
import { getNote, updateNote } from "../../api/content";
import { useAppStore } from "../../store/useAppStore";

export const MemoEditor = () => {
  const activeNoteMaterial = useAppStore((state) => state.activeNoteMaterial);
  const setActiveNoteMaterial = useAppStore((state) => state.setActiveNoteMaterial);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const lastSavedRef = useRef<{ title: string; content: string } | null>(null);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    if (!activeNoteMaterial) {
      setTitle("");
      setContent("");
      setErrorMessage("");
      setIsLoading(false);
      setIsSaving(false);
      lastSavedRef.current = null;
      return;
    }

    let cancelled = false;

    const fetchNote = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        isHydratingRef.current = true;

        const note = await getNote(activeNoteMaterial.id);
        if (cancelled) return;

        setTitle(note.title);
        setContent(note.content);
        lastSavedRef.current = {
          title: note.title,
          content: note.content,
        };
      } catch (error) {
        console.error("노트 불러오기 실패:", error);
        if (!cancelled) {
          setErrorMessage("노트를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setTimeout(() => {
            isHydratingRef.current = false;
          }, 0);
        }
      }
    };

    fetchNote();

    return () => {
      cancelled = true;
    };
  }, [activeNoteMaterial?.id]);

  useEffect(() => {
    if (!activeNoteMaterial) return;
    if (isLoading) return;
    if (isHydratingRef.current) return;
    if (!lastSavedRef.current) return;

    const changed =
      title !== lastSavedRef.current.title ||
      content !== lastSavedRef.current.content;

    if (!changed) return;

    const timer = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        const updated = await updateNote(activeNoteMaterial.id, {
          title,
          content,
        });

        lastSavedRef.current = {
          title: updated.title,
          content: updated.content,
        };

        setActiveNoteMaterial({
          ...activeNoteMaterial,
          original_name: updated.title,
        });
      } catch (error) {
        console.error("노트 자동 저장 실패:", error);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [title, content, activeNoteMaterial?.id, isLoading, setActiveNoteMaterial]);

  if (!activeNoteMaterial) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center text-gray-400">
        <FileText className="mb-4 h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">선택된 노트가 없습니다</p>
        <p className="mt-2 text-xs leading-5">
          좌측 NOTE 목록에서 노트를 선택하거나,
          <br />
          NOTE 옆 + 버튼으로 새 노트를 만들어보세요.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center text-gray-400">
        <Loader2 className="mb-4 h-8 w-8 animate-spin opacity-50" />
        <p className="text-sm font-medium">노트를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="노트 제목"
            className="w-full truncate bg-transparent text-sm font-semibold text-gray-800 outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            자동 저장됩니다
          </p>
        </div>

        <div className="ml-3 flex items-center gap-2 text-xs text-gray-400">
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              저장됨
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-500">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="여기에 노트를 작성하세요..."
          className="h-full w-full resize-none bg-transparent text-sm leading-7 text-gray-700 outline-none"
        />
      </div>
    </div>
  );
};