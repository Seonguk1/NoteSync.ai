import { useCallback, useEffect, useMemo, useState } from "react"

import { PlusCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { AppShell, PageHeader } from "../../../components/layout"
import { Button } from "../../../components/ui"
import { UploadLectureModal } from "../../upload/components/UploadLectureModal"
import {
  createFolder,
  deleteBoard,
  deleteFolder,
  fetchBoards,
  fetchBoardStatus,
  fetchFolders,
  updateBoardMeta,
  updateFolder,
} from "../api"
import { retryBoard } from "../api"
import { LectureSidebar } from "../components/LectureSidebar"
import { LectureTable } from "../components/LectureTable"
import { LECTURE_STATUS, type FolderItem, type LectureItem } from "../types"

export function MyLectureRoomScreen() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [lectures, setLectures] = useState<LectureItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const navigate = useNavigate()

  // 선택된 폴더명 추출 (없으면 null)
  const selectedFolderName = useMemo(() => {
    if (selectedFolderId == null) return ""
    const folder = folders.find((f) => f.id === selectedFolderId)
    return folder ? folder.name : ""
  }, [folders, selectedFolderId])

  const processingBoardIds = useMemo(
    () => lectures.filter((item) => item.status === LECTURE_STATUS.processing).map((item) => item.id),
    [lectures],
  )

  const filteredLectures = useMemo(() => {
    if (selectedFolderId === null) return lectures
    return lectures.filter((item) => item.folderId === selectedFolderId)
  }, [lectures, selectedFolderId])

  const reloadLectureRoom = useCallback(async () => {
    setErrorMessage(null)
    const [nextBoards, nextFolders] = await Promise.all([fetchBoards(), fetchFolders()])
    setLectures(nextBoards)
    setFolders(nextFolders)
  }, [])

  useEffect(() => {
    let isActive = true

    async function initialize() {
      setIsLoading(true)
      try {
        const [nextBoards, nextFolders] = await Promise.all([fetchBoards(), fetchFolders()])
        if (!isActive) return
        setLectures(nextBoards)
        setFolders(nextFolders)
      } catch (error) {
        if (!isActive) return
        setErrorMessage(error instanceof Error ? error.message : "강의실 데이터를 불러오지 못했습니다.")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void initialize()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (processingBoardIds.length === 0) {
      return
    }

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const statuses = await Promise.all(processingBoardIds.map((boardId) => fetchBoardStatus(boardId)))
          let shouldReload = false

          setLectures((prev) =>
            prev.map((lecture) => {
              const nextStatus = statuses.find((item) => item.board_id === lecture.id)
              if (!nextStatus) return lecture

              const isTerminal = nextStatus.status === LECTURE_STATUS.completed || nextStatus.status === LECTURE_STATUS.failed
              if (isTerminal) {
                shouldReload = true
              }

              return {
                ...lecture,
                status: nextStatus.status === "failed" ? LECTURE_STATUS.failed : nextStatus.status === "completed" ? LECTURE_STATUS.completed : LECTURE_STATUS.processing,
                progressPercent: nextStatus.progress_percent,
              }
            }),
          )

          if (shouldReload) {
            await reloadLectureRoom()
          }
        } catch {
          // 폴링 실패 시 다음 주기에 재시도
        }
      })()
    }, 3000)

    return () => {
      window.clearInterval(timer)
    }
  }, [processingBoardIds, reloadLectureRoom])

  useEffect(() => {
    if (!infoMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setInfoMessage(null)
    }, 5000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [infoMessage])

  async function handleCreateFolder(name: string) {
    try {
      await createFolder(name)
      await reloadLectureRoom()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "폴더를 생성하지 못했습니다.")
    }
  }

  async function handleRenameBoard(boardId: number, nextTitle: string) {
    await updateBoardMeta(boardId, { title: nextTitle })
    setInfoMessage("보드 이름이 수정되었습니다.")
    await reloadLectureRoom()
  }

  async function handleMoveBoard(boardId: number, nextFolderId: number) {
    await updateBoardMeta(boardId, { folderId: nextFolderId })
    setInfoMessage("보드 폴더가 변경되었습니다.")
    await reloadLectureRoom()
  }

  async function handleDeleteBoard(boardId: number) {
    await deleteBoard(boardId)
    setInfoMessage("보드가 삭제되었습니다.")
    await reloadLectureRoom()
  }

  async function handleRenameFolder(folderId: number, nextName: string) {
    await updateFolder(folderId, nextName)
    setInfoMessage("폴더 이름이 수정되었습니다.")
    await reloadLectureRoom()
  }

  async function handleDeleteFolder(folderId: number) {
    await deleteFolder(folderId)
    setInfoMessage("폴더가 삭제되었습니다.")
    await reloadLectureRoom()
  }

  async function handleRetryBoard(boardId: number) {
    await retryBoard(boardId)
    setInfoMessage("재시도 요청이 전송되었습니다. 상태가 곧 갱신됩니다.")
    await reloadLectureRoom()
  }

  return (
    <>
      <AppShell
        header={
          <PageHeader
            title="내 강의실"
            description={errorMessage ?? infoMessage ?? "강의 업로드 상태와 추출 결과를 한 곳에서 관리합니다."}
            actions={
              <Button leadingIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setIsUploadModalOpen(true)}>
                새 강의 업로드
              </Button>
            }
          />
        }
        sidebar={
          <LectureSidebar
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
          />
        }
      >
        <div className="h-full overflow-auto p-6">
          {processingBoardIds.length > 0 ? (
            <div className="mb-4 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-[var(--color-text-muted)]">
              처리 중인 항목은 완료 전까지 상세 화면 진입이 제한됩니다. 진행률은 3초 주기로 자동 갱신됩니다.
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-[var(--radius-lg)] border border-slate-200 bg-white p-10 text-center text-sm text-[var(--color-text-muted)]">
              강의 목록을 불러오는 중입니다...
            </div>
          ) : (
            <LectureTable
              folders={folders}
              items={filteredLectures}
              onDeleteBoard={handleDeleteBoard}
              onMoveBoard={handleMoveBoard}
              onOpenBoard={(id) => navigate(`/boards/${id}`)}
              onRenameBoard={handleRenameBoard}
              onRetry={item => handleRetryBoard(item.id)}
            />
          )}
        </div>
      </AppShell>

      {isUploadModalOpen ? (
        <UploadLectureModal
          initialLectureName={selectedFolderName}
          onClose={() => setIsUploadModalOpen(false)}
          onUploaded={() => {
            setErrorMessage(null)
            setInfoMessage("업로드 전송이 완료되어 서버 처리(queued)가 시작되었습니다.")
            void reloadLectureRoom()
          }}
        />
      ) : null}
    </>
  )
}
