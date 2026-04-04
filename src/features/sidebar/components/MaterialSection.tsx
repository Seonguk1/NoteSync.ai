import {
    FileText,
    Headphones,
    MoreHorizontal,
    Plus,
    StickyNote,
    Video,
} from "lucide-react";
import type { Material } from "../../../api/content";

const typeIconMap = {
    pdf: FileText,
    audio: Headphones,
    video: Video,
    note: StickyNote,
} as const;

const typeLabelMap = {
    pdf: "PDF",
    audio: "AUDIO",
    video: "VIDEO",
    note: "NOTE",
} as const;

type MaterialSectionProps = {
    title: string;
    items: Material[];
    viewingMaterialId?: number;
    playingMaterialId?: number;
    activeNoteMaterialId?: number;
    openMenuId: number | null;
    onOpenMenu: (materialId: number | null) => void;
    onClickItem: (material: Material) => void;
    onRename: (material: Material) => void;
    onDelete: (material: Material) => void;
    onCreate?: () => void;
};

export const MaterialSection = ({
    title,
    items,
    viewingMaterialId,
    playingMaterialId,
    activeNoteMaterialId,
    openMenuId,
    onOpenMenu,
    onClickItem,
    onRename,
    onDelete,
    onCreate,
}: MaterialSectionProps) => {
    if (items.length === 0 && !onCreate) return null;

    return (
        <section>
            <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-semibold tracking-wide text-slate-400">
                    {title}
                </p>

                {onCreate && (
                    <button
                        type="button"
                        onClick={onCreate}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                        aria-label={`${title} 생성`}
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <div className="space-y-1.5">
                {items.map((material) => {
                    const Icon = typeIconMap[material.type];
                    const isViewing = viewingMaterialId === material.id;
                    const isPlaying = playingMaterialId === material.id;
                    const isActiveNote = activeNoteMaterialId === material.id;
                    const isSelected = material.type === "note" ? isActiveNote : isViewing;
                    const isMenuOpen = openMenuId === material.id;

                    return (
                        <div key={material.id} className="relative">
                            <button
                                type="button"
                                onClick={() => onClickItem(material)}
                                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 pr-10 text-left transition-all ${isSelected
                                        ? "border-blue-200 bg-blue-50 text-blue-700"
                                        : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {material.original_name}
                                    </p>

                                    <div className="mt-0.5 flex items-center gap-2">
                                        <span className="text-[10px] font-semibold tracking-wide text-slate-400">
                                            {typeLabelMap[material.type]}
                                        </span>

                                        <StatusBadge status={material.status} />

                                        {isPlaying && (
                                            <span className="text-[10px] font-semibold tracking-wide text-blue-500">
                                                PLAYING
                                            </span>
                                        )}

                                        {isActiveNote && (
                                            <span className="text-[10px] font-semibold tracking-wide text-violet-500">
                                                EDITING
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    console.log("menu", material.id);
                                    e.stopPropagation();
                                    onOpenMenu(isMenuOpen ? null : material.id);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                                aria-label="더보기"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-2 top-11 z-20 w-32 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            console.log("rename", material.id);
                                            e.stopPropagation();
                                            onRename(material);
                                            onOpenMenu(null);
                                        }}
                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        이름 변경
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(material);
                                            onOpenMenu(null);
                                        }}
                                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                                    >
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const StatusBadge = ({
    status,
}: {
    status: Material["status"];
}) => {
    const styleMap = {
        READY: "bg-slate-100 text-slate-500",
        PROCESSING: "bg-amber-100 text-amber-600",
        COMPLETED: "bg-emerald-100 text-emerald-600",
        FAILED: "bg-red-100 text-red-500",
    } as const;

    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styleMap[status]
                }`}
        >
            {status}
        </span>
    );
};