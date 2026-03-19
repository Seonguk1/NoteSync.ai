import { useEffect, useState } from "react"
import { useBoardDetailData } from "../hooks/useBoardDetailData"
import { usePlayback } from "../hooks/usePlayback"
import { useTranscript } from "../hooks/useTranscript"
import { useBoardDetailsKeydown } from "../hooks/useBoardDetailsKeydown"
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner"
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels"
import { useNavigate, useParams } from "react-router-dom"
import { BoardMetaModal } from "../components/BoardMetaModal"
import { STUDY_SPLIT } from "../../../constants/layout"
import { MediaStage } from "../components/MediaStage"
import { PlayerBar } from "../components/PlayerBar"
import { StudyHeader } from "../components/StudyHeader"
import { TranscriptPanel } from "../components/TranscriptPanel"
import { PLAYBACK_RATES } from "../constants"
import type { PlaybackRate } from "../constants"

export function cleanSubtitle(text: string) {
  return text.replace(/^\[\d{2}:\d{2}\s*->\s*\d{2}:\d{2}]\s*/, "");
}

function getNextPlaybackRate(
  current: PlaybackRate
): PlaybackRate {
  const currentIndex = PLAYBACK_RATES.indexOf(current)
  return PLAYBACK_RATES[Math.min(currentIndex + 1, PLAYBACK_RATES.length - 1)]
}
function getPreviousPlaybackRate(
  current: PlaybackRate
): PlaybackRate {
  const currentIndex = PLAYBACK_RATES.indexOf(current)
  return PLAYBACK_RATES[Math.max(currentIndex - 1, 0)]
}

export function BoardDetailsScreen() {
  const scriptPanelRef = usePanelRef()
  const navigate = useNavigate()
  const { id } = useParams()

  // 1. 보드 상세/폴더/메타데이터 훅
  const {
    boardDetail,
    setBoardDetail,
    boardMedia,
    isLoading,
    errorMessage,
    isMetaModalOpen,
    editingTitle,
    editingFolderId,
    isSavingMeta,
    setEditingTitle,
    setEditingFolderId,
    setIsMetaModalOpen,
    folderOptions,
    openMetaModal,
    handleSaveMeta,
  } = useBoardDetailData(id)

  const transcriptSource = boardDetail.transcript
  const boardInfo = boardDetail.boardInfo
  const initialPlaybackPoint = transcriptSource[0]?.startSeconds ?? 0

  // 2. 재생 상태 훅
  const {
    isPlaying,
    currentSeconds,
    volume,
    playbackRate,
    setVolume,
    setPlaybackRate,
    handlePlayPause,
    handleSeek,
    handleSkipBack,
    handleSkipForward,
    handleMediaTimeUpdate,
    handleMediaPlaybackStateChange,
  } = usePlayback(boardInfo.durationSeconds, initialPlaybackPoint)

  // 3. 트랜스크립트 상태 훅
  const {
    transcriptSegments,
    setTranscriptSegments,
    activeSegmentId,
    setActiveSegmentId,
    editingSegmentId,
    setEditingSegmentId,
    searchQuery,
    setSearchQuery,
    handleActivate,
    handleStartEdit,
    handleFinishEdit,
  } = useTranscript({
    initialSegments: transcriptSource,
    currentSeconds,
    isPlaying,
    boardId: id ?? 0,
  })

  // 4. 스크립트 패널 접기/펼치기 상태
  const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false)

  // 키다운 핸들러
  useBoardDetailsKeydown({
    handlePlayPause,
    handleSkipBack,
    handleSkipForward,
    setPlaybackRate: (up: boolean) => setPlaybackRate((prev: 0.5 | 1 | 1.25 | 1.5 | 2) => up ? getNextPlaybackRate(prev) : getPreviousPlaybackRate(prev)),
  })

  // 미디어 길이 변경 시 보드 정보 갱신
  const handleMediaDurationChange = (durationSeconds: number) => {
    setBoardDetail((prev) => {
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return prev
      if (Math.abs(prev.boardInfo.durationSeconds - durationSeconds) < 1) return prev
      return {
        ...prev,
        boardInfo: {
          ...prev.boardInfo,
          durationSeconds: Math.floor(durationSeconds),
        },
      }
    })
  }

  // 자막/재생 상태 초기화 (보드 변경 시)
  useEffect(() => {
    setActiveSegmentId(transcriptSource[0]?.id ?? 0)
    setEditingSegmentId(null)
    setSearchQuery("")
    setTranscriptSegments(transcriptSource)
    scriptPanelRef.current?.expand()
  }, [scriptPanelRef, transcriptSource, setActiveSegmentId, setEditingSegmentId, setSearchQuery, setTranscriptSegments])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-canvas)]">

      {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner size={40} />
        </div>
      ) : (
        <>
          {errorMessage ? (
              <div className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-700">
              {errorMessage}
            </div>
          ) : null}
          
          {/* 상단 헤더 */}
          <StudyHeader
            folder={boardInfo.folder}
            onBack={() => navigate("/")}
            onEditMeta={openMetaModal}
            title={boardInfo.title}
          />

          {/* 중앙 워크스페이스 (좌: 미디어 70 / 우: 스크립트 30) */}
          <div className="flex-1 overflow-hidden">
            <Group className="h-full" orientation="horizontal">
              <Panel
                defaultSize={STUDY_SPLIT.mediaDefault}
                minSize={STUDY_SPLIT.mediaMin}
              >
                <MediaStage
                  currentSeconds={currentSeconds}
                  instructor={boardInfo.instructor}
                  isPlaying={isPlaying}
                  mediaMimeType={boardMedia?.mimeType}
                  pdfUrl={boardDetail.pdf?.url}
                  mediaUrl={boardMedia?.url}
                  onCurrentTimeChange={handleMediaTimeUpdate}
                  onDurationChange={handleMediaDurationChange}
                  onPlaybackStateChange={handleMediaPlaybackStateChange}
                  onPlayPause={handlePlayPause}
                  playbackRate={playbackRate}
                  recordedAtLabel={boardInfo.recordedAtLabel}
                  subtitleText={cleanSubtitle(transcriptSegments.find((s) => s.id === activeSegmentId)?.text ?? "")}
                  title={boardInfo.title}
                  volume={volume}
                />
              </Panel>

              <Separator className="w-1.5 cursor-col-resize bg-slate-200 transition-colors hover:bg-[var(--color-brand-400)] active:bg-[var(--color-brand-500)]" />

              <Panel
                collapsedSize={6}
                collapsible
                defaultSize={STUDY_SPLIT.scriptDefault}
                minSize={6}
                onResize={(size) => setIsTranscriptCollapsed(size.asPercentage <= 6)}
                panelRef={scriptPanelRef}
              >
                <TranscriptPanel
                  activeSegmentId={activeSegmentId}
                  editingSegmentId={editingSegmentId}
                  isCollapsed={isTranscriptCollapsed}
                  onActivate={handleActivate}
                  onFinishEdit={handleFinishEdit}
                  onSearchChange={setSearchQuery}
                  onStartEdit={handleStartEdit}
                  onToggleCollapse={() => setIsTranscriptCollapsed((v) => !v)}
                  searchQuery={searchQuery}
                  segments={transcriptSegments}
                />
              </Panel>
            </Group>
          </div>

          {/* 하단 플레이어 바 */}
          <PlayerBar
            currentSeconds={currentSeconds}
            durationSeconds={boardInfo.durationSeconds}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onRateChange={setPlaybackRate}
            onSeek={handleSeek}
            onSkipBack={handleSkipBack}
            onSkipForward={handleSkipForward}
            onVolumeChange={setVolume}
            playbackRate={playbackRate}
            volume={volume}
          />

          <BoardMetaModal
            isOpen={isMetaModalOpen}
            isSaving={isSavingMeta}
            title={editingTitle}
            folderId={editingFolderId}
            folderOptions={folderOptions}
            onTitleChange={setEditingTitle}
            onFolderChange={setEditingFolderId}
            onClose={() => setIsMetaModalOpen(false)}
            onSave={() => void handleSaveMeta()}
          />
        </>
      )}
    </div>
  )
}