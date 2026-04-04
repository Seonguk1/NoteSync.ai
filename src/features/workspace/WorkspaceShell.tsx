// src/features/workspace/WorkspaceShell.tsx

import { useEffect, useState } from "react";
import {
    Group,
    Panel,
    Separator,
    usePanelRef,
} from "react-resizable-panels";
import { Sidebar } from "../sidebar/Sidebar";
import { TranscriptViewer } from "../transcript/TranscriptViewer";
import { Workspace } from "./Workspace";
import { useAppStore } from "../../store/useAppStore";

export const WorkspaceShell = () => {
    const leftPanelRef = usePanelRef();
    const rightPanelRef = usePanelRef();

    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    const skipBy = useAppStore((state) => state.skipBy);
    const increasePlaybackRate = useAppStore((state) => state.increasePlaybackRate);
    const decreasePlaybackRate = useAppStore((state) => state.decreasePlaybackRate);
    const togglePlayPause = useAppStore((state) => state.togglePlayPause);
    const toggleSubtitlePosition = useAppStore((state) => state.toggleSubtitlePosition);
    
    const syncCollapsedState = () => {
        setLeftCollapsed(leftPanelRef.current?.isCollapsed() ?? false);
        setRightCollapsed(rightPanelRef.current?.isCollapsed() ?? false);
    };

    const collapseBoth = () => {
        leftPanelRef.current?.collapse();
        rightPanelRef.current?.collapse();
        syncCollapsedState();
    };

    const expandBoth = () => {
        leftPanelRef.current?.expand();
        rightPanelRef.current?.expand();
        syncCollapsedState();
    };

    const toggleStudyMode = () => {
        const bothCollapsed =
            (leftPanelRef.current?.isCollapsed() ?? false) &&
            (rightPanelRef.current?.isCollapsed() ?? false);

        if (bothCollapsed) {
            expandBoth();
        } else {
            collapseBoth();
        }
    };

    // src/features/workspace/WorkspaceShell.tsx

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase();

            const isEditable =
                tagName === "input" ||
                tagName === "textarea" ||
                tagName === "select" ||
                target?.isContentEditable;

            // 텍스트 입력 중이면 단축키 전부 무시
            if (isEditable) return;

            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    skipBy(-5);
                    break;

                case "ArrowRight":
                    event.preventDefault();
                    skipBy(5);
                    break;

                case "ArrowUp":
                    event.preventDefault();
                    increasePlaybackRate();
                    break;

                case "ArrowDown":
                    event.preventDefault();
                    decreasePlaybackRate();
                    break;

                case "f":
                case "F":
                    event.preventDefault();
                    toggleStudyMode();
                    break;

                case "s":
                case "S":
                    event.preventDefault();
                    toggleSubtitlePosition();
                    break;

                default:
                    // 스페이스바는 key가 " " 로 들어오는 경우가 많아서 code로 처리
                    if (event.code === "Space") {
                        event.preventDefault();
                        togglePlayPause();
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        skipBy,
        increasePlaybackRate,
        decreasePlaybackRate,
        togglePlayPause,
        toggleSubtitlePosition,
    ]);

    return (
        <main className="h-full w-full overflow-hidden">
            <Group orientation="horizontal" id="notesync-main-layout" className="h-full w-full">
                <Panel
                    panelRef={leftPanelRef}
                    id="materials-sidebar"
                    defaultSize="18%"
                    minSize="14%"
                    maxSize="26%"
                    collapsible
                    collapsedSize="0%"
                    onResize={syncCollapsedState}
                    className="border-r border-gray-200 bg-slate-100"
                >
                    <Sidebar
                        collapsed={leftCollapsed}
                        onToggle={() => {
                            if (leftPanelRef.current?.isCollapsed()) {
                                leftPanelRef.current.expand();
                            } else {
                                leftPanelRef.current?.collapse();
                            }
                            syncCollapsedState();
                        }}
                    />
                </Panel>

                <Divider />

                <Panel defaultSize="57%" minSize="35%" className="bg-white">
                    <Workspace />
                </Panel>

                <Divider />

                <Panel
                    panelRef={rightPanelRef}
                    id="transcript-sidebar"
                    defaultSize="25%"
                    minSize="18%"
                    maxSize="35%"
                    collapsible
                    collapsedSize="0%"
                    onResize={syncCollapsedState}
                    className="border-l border-gray-200 bg-gray-50"
                >
                    <TranscriptViewer
                        collapsed={rightCollapsed}
                        onToggle={() => {
                            if (rightPanelRef.current?.isCollapsed()) {
                                rightPanelRef.current.expand();
                            } else {
                                rightPanelRef.current?.collapse();
                            }
                            syncCollapsedState();
                        }}
                    />
                </Panel>
            </Group>
        </main>
    );
};

const Divider = () => {
    return (
        <Separator className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-500 outline-none" />
    );
};