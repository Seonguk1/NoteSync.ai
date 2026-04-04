// src/App.tsx

import { Header } from "./features/layout/Header";
import { BottomPlayer } from "./features/player/BottomPlayer";
import { WorkspaceShell } from "./features/workspace/WorkspaceShell";
import { SessionModal } from "./components/SessionModal";

export default function App() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-50 font-sans text-gray-800">
      <SessionModal />

      <Header />

      <div className="min-h-0 flex-1">
        <WorkspaceShell />
      </div>

      <BottomPlayer />
    </div>
  );
}