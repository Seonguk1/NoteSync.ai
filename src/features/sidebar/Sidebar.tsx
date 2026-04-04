import { useEffect, useMemo, useState, useRef } from "react";
import {
  PanelLeftClose,
  PlayCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  deleteMaterial,
  getMaterials,
  type Material,
} from "../../api/content";
import { usePolling } from "../../hooks/usePolling";
import { useAppStore } from "../../store/useAppStore";
import { UploadMaterialModal } from "./components/UploadMaterialModal";
import { CreateNoteModal } from "./components/CreateNoteModal";
import { RenameMaterialModal } from "./components/RenameMaterialModal";
import { MaterialSection } from "./components/MaterialSection";

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export const Sidebar = ({
  collapsed = false,
  onToggle,
}: SidebarProps) => {
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const viewingMaterial = useAppStore((state) => state.viewingMaterial);
  const playingMaterial = useAppStore((state) => state.playingMaterial);
  const activeNoteMaterial = useAppStore((state) => state.activeNoteMaterial);

  const openMaterial = useAppStore((state) => state.openMaterial);
  const setViewingMaterial = useAppStore((state) => state.setViewingMaterial);
  const setPlayingMaterial = useAppStore((state) => state.setPlayingMaterial);
  const setActiveNoteMaterial = useAppStore((state) => state.setActiveNoteMaterial);
  const resetPlaybackState = useAppStore((state) => state.resetPlaybackState);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [renamingMaterial, setRenamingMaterial] = useState<Material | null>(null);

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!sidebarRef.current) return;

      if (!sidebarRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchMaterials = async () => {
    if (!currentSessionId) {
      setMaterials([]);
      return;
    }

    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setErrorMessage("");

      const data = await getMaterials(currentSessionId);

      const sorted = [...data].sort((a, b) => {
        const statusOrder = {
          COMPLETED: 0,
          READY: 1,
          PROCESSING: 2,
          FAILED: 3,
        } as const;

        const aOrder = statusOrder[a.status] ?? 99;
        const bOrder = statusOrder[b.status] ?? 99;

        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setMaterials(sorted);
    } catch (error) {
      console.error("자료 목록 불러오기 실패:", error);
      setErrorMessage("자료 목록을 불러오지 못했습니다.");
      setMaterials([]);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [currentSessionId]);

  const hasProcessing = materials.some((m) => m.status === "PROCESSING");

  usePolling(fetchMaterials, hasProcessing, 3000);

  const groupedMaterials = useMemo(() => {
    return {
      pdf: materials.filter((item) => item.type === "pdf"),
      video: materials.filter((item) => item.type === "video"),
      audio: materials.filter((item) => item.type === "audio"),
      note: materials.filter((item) => item.type === "note"),
    };
  }, [materials]);

  const handleDeleteMaterial = async (material: Material) => {
    const ok = window.confirm(`'${material.original_name}' 자료를 삭제할까요?`);
    if (!ok) return;

    try {
      await deleteMaterial(material.id);

      if (viewingMaterial?.id === material.id) {
        setViewingMaterial(null);
      }

      if (playingMaterial?.id === material.id) {
        setPlayingMaterial(null);
        resetPlaybackState();
      }

      if (activeNoteMaterial?.id === material.id) {
        setActiveNoteMaterial(null);
      }

      await fetchMaterials();
    } catch (error) {
      console.error("자료 삭제 실패:", error);
      window.alert("자료 삭제에 실패했습니다.");
    }
  };

  return (
    <>
      <aside className="flex h-full w-full flex-col bg-slate-100" ref={sidebarRef}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-slate-400">
              MATERIALS
            </p>
            <h2 className="text-sm font-semibold text-slate-700">
              학습 자료
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={!currentSessionId}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="자료 업로드"
              title="자료 업로드"
            >
              <Plus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={fetchMaterials}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label="자료 새로고침"
              title="자료 새로고침"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!currentSessionId && (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">
            세션을 먼저 선택해주세요.
          </div>
        )}

        {currentSessionId && (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {isLoading && (
              <div className="flex items-center justify-center py-10 text-sm text-slate-400">
                자료를 불러오는 중...
              </div>
            )}

            {!isLoading && errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-500">
                {errorMessage}
              </div>
            )}

            {!isLoading && !errorMessage && materials.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <PlayCircle className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">업로드된 자료가 없습니다.</p>
              </div>
            )}

            {!isLoading && !errorMessage && materials.length > 0 && (
              <div className="space-y-5">
                <MaterialSection
                  title="PDF"
                  items={groupedMaterials.pdf}
                  viewingMaterialId={viewingMaterial?.id}
                  playingMaterialId={playingMaterial?.id}
                  activeNoteMaterialId={activeNoteMaterial?.id}
                  openMenuId={openMenuId}
                  onOpenMenu={setOpenMenuId}
                  onClickItem={openMaterial}
                  onRename={setRenamingMaterial}
                  onDelete={handleDeleteMaterial}
                />

                <MaterialSection
                  title="VIDEO"
                  items={groupedMaterials.video}
                  viewingMaterialId={viewingMaterial?.id}
                  playingMaterialId={playingMaterial?.id}
                  activeNoteMaterialId={activeNoteMaterial?.id}
                  openMenuId={openMenuId}
                  onOpenMenu={setOpenMenuId}
                  onClickItem={openMaterial}
                  onRename={setRenamingMaterial}
                  onDelete={handleDeleteMaterial}
                />

                <MaterialSection
                  title="AUDIO"
                  items={groupedMaterials.audio}
                  viewingMaterialId={viewingMaterial?.id}
                  playingMaterialId={playingMaterial?.id}
                  activeNoteMaterialId={activeNoteMaterial?.id}
                  openMenuId={openMenuId}
                  onOpenMenu={setOpenMenuId}
                  onClickItem={openMaterial}
                  onRename={setRenamingMaterial}
                  onDelete={handleDeleteMaterial}
                />

                <MaterialSection
                  title="NOTE"
                  items={groupedMaterials.note}
                  viewingMaterialId={viewingMaterial?.id}
                  playingMaterialId={playingMaterial?.id}
                  activeNoteMaterialId={activeNoteMaterial?.id}
                  openMenuId={openMenuId}
                  onOpenMenu={setOpenMenuId}
                  onClickItem={openMaterial}
                  onRename={setRenamingMaterial}
                  onDelete={handleDeleteMaterial}
                  onCreate={() => setIsCreateNoteModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}
      </aside>

      <UploadMaterialModal
        open={isUploadModalOpen}
        sessionId={currentSessionId}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={fetchMaterials}
      />

      <CreateNoteModal
        open={isCreateNoteModalOpen}
        sessionId={currentSessionId}
        onClose={() => setIsCreateNoteModalOpen(false)}
        onCreated={(material) => {
          fetchMaterials();
          setActiveNoteMaterial(material);
        }}
      />

      <RenameMaterialModal
        open={!!renamingMaterial}
        material={renamingMaterial}
        onClose={() => setRenamingMaterial(null)}
        onRenamed={async (updatedMaterial) => {
          if (viewingMaterial?.id === updatedMaterial.id) {
            setViewingMaterial(updatedMaterial);
          }

          if (playingMaterial?.id === updatedMaterial.id) {
            setPlayingMaterial(updatedMaterial);
          }

          if (activeNoteMaterial?.id === updatedMaterial.id) {
            setActiveNoteMaterial(updatedMaterial);
          }

          await fetchMaterials();
        }}
      />
    </>
  );
};