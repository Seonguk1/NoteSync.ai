// src/features/workspace/Workspace.tsx

import { Group, Panel, Separator } from "react-resizable-panels";
import { MaterialViewer } from "./MaterialViewer";
import { MemoEditor } from "./MemoEditor";

export const Workspace = () => {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Group orientation="horizontal" id="notesync-workspace-layout" className="h-full w-full">
        <Panel
          defaultSize="55%"
          minSize="35%"
          className="border-r border-gray-200 bg-black/5"
        >
          <MaterialViewer />
        </Panel>

        <Divider />

        <Panel
          defaultSize="45%"
          minSize="15%"
          className="bg-white"
        >
          <MemoEditor />
        </Panel>
      </Group>
    </div>
  );
};

const Divider = () => {
  return (
    <Separator className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-500 outline-none" />
  );
};