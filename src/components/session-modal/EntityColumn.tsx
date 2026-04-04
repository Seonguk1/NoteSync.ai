// src/components/session-modal/EntityColumn.tsx

import { Loader2, Plus } from "lucide-react";
import { EntityRow } from "./EntityRow";

type EditableEntity = "term" | "course" | "session";

type EntityItem = {
  id: number;
  name: string;
};

type EntityColumnProps<T extends EntityItem> = {
  entity: EditableEntity;
  title: string;
  items: T[];
  selectedId: number | null;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (id: number) => void;
  onCreate: () => void;
  openMenu: { entity: EditableEntity; id: number } | null;
  setOpenMenu: (value: { entity: EditableEntity; id: number } | null) => void;
  onRename: (item: T) => void;
  onDelete: (item: T) => void;
};

export const EntityColumn = <T extends EntityItem>({
  entity,
  title,
  items,
  selectedId,
  loading = false,
  disabled = false,
  onSelect,
  onCreate,
  openMenu,
  setOpenMenu,
  onRename,
  onDelete,
}: EntityColumnProps<T>) => {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-700">{title}</p>

        <button
          type="button"
          onClick={onCreate}
          disabled={disabled}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`${title} 추가`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[360px] overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            항목이 없습니다
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <EntityRow
                key={item.id}
                entity={entity}
                item={item}
                isSelected={selectedId === item.id}
                isMenuOpen={openMenu?.entity === entity && openMenu?.id === item.id}
                setOpenMenu={setOpenMenu}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                // openMenu prop 제거
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};