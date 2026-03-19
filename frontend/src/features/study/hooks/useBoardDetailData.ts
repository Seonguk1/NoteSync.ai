import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchBoardDetail, fetchFolderOptions, updateBoardMeta } from "../api"
import { getMockBoardDetailById } from "../constants"
import type { BoardMedia, TranscriptSegment } from "../types"

export function useBoardDetailData(id: string | undefined) {
  const mockBoardDetail = useMemo(() => getMockBoardDetailById(id), [id])
  const [boardDetail, setBoardDetail] = useState(mockBoardDetail)
  const [boardMedia, setBoardMedia] = useState<BoardMedia | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRemoteBoardLoaded, setIsRemoteBoardLoaded] = useState(false)
  const [folderId, setFolderId] = useState<number | null>(null)
  const [folderOptions, setFolderOptions] = useState<Array<{ id: number; name: string }>>([])
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState("")
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  // 보드 상세 데이터 패칭
  useEffect(() => {
    let isActive = true
    const boardId = Number(id)
    async function loadBoardDetail() {
      if (!Number.isFinite(boardId) || boardId <= 0) {
        setBoardDetail(mockBoardDetail)
        setBoardMedia(null)
        setIsRemoteBoardLoaded(false)
        setErrorMessage("잘못된 보드 ID입니다. mock 데이터로 표시합니다.")
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const nextBoardDetail = await fetchBoardDetail(boardId)
        if (!isActive) return
        setBoardDetail(nextBoardDetail)
        setBoardMedia(nextBoardDetail.media)
        setFolderId(nextBoardDetail.folderId)
        setIsRemoteBoardLoaded(true)
      } catch (error) {
        if (!isActive) return
        setBoardDetail(mockBoardDetail)
        setBoardMedia(null)
        setFolderId(null)
        setIsRemoteBoardLoaded(false)
        setErrorMessage(error instanceof Error ? error.message : "보드 상세 데이터를 불러오지 못했습니다. mock 데이터로 표시합니다.")
      } finally {
        if (isActive) setIsLoading(false)
      }
    }
    void loadBoardDetail()
    return () => { isActive = false }
  }, [id, mockBoardDetail])

  // 폴더 옵션 패칭
  useEffect(() => {
    let isActive = true
    async function loadFolders() {
      try {
        const nextFolders = await fetchFolderOptions()
        if (!isActive) return
        setFolderOptions(nextFolders)
      } catch {
        if (!isActive) return
        setFolderOptions([])
      }
    }
    void loadFolders()
    return () => { isActive = false }
  }, [])

  // 메타데이터 수정 모달 열기
  const openMetaModal = useCallback(() => {
    setEditingTitle(boardDetail.boardInfo.title)
    setEditingFolderId(folderId)
    setIsMetaModalOpen(true)
  }, [boardDetail.boardInfo.title, folderId])

  // 메타데이터 저장
  const handleSaveMeta = useCallback(async () => {
    const boardId = Number(id)
    if (!isRemoteBoardLoaded || !Number.isFinite(boardId) || boardId <= 0) {
      setIsMetaModalOpen(false)
      return
    }
    const trimmedTitle = editingTitle.trim()
    if (!trimmedTitle) {
      setErrorMessage("보드 제목은 공백으로 저장할 수 없습니다.")
      return
    }
    const payload: { title?: string; folder_id?: number } = {}
    if (trimmedTitle !== boardDetail.boardInfo.title) payload.title = trimmedTitle
    if (editingFolderId != null && editingFolderId !== folderId) payload.folder_id = editingFolderId
    if (!payload.title && !payload.folder_id) {
      setIsMetaModalOpen(false)
      return
    }
    try {
      setIsSavingMeta(true)
      const updated = await updateBoardMeta(boardId, payload)
      setBoardDetail((prev) => ({
        ...prev,
        boardInfo: {
          ...prev.boardInfo,
          title: updated.title,
          folder: updated.folder.name,
        },
      }))
      setFolderId(updated.folder.id)
      setErrorMessage(null)
      setIsMetaModalOpen(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "보드 메타데이터 저장에 실패했습니다.")
    } finally {
      setIsSavingMeta(false)
    }
  }, [id, isRemoteBoardLoaded, editingTitle, editingFolderId, folderId, boardDetail.boardInfo.title])

  return {
    boardDetail,
    setBoardDetail,
    boardMedia,
    isLoading,
    errorMessage,
    setErrorMessage,
    isRemoteBoardLoaded,
    folderId,
    folderOptions,
    isMetaModalOpen,
    editingTitle,
    editingFolderId,
    isSavingMeta,
    setEditingTitle,
    setEditingFolderId,
    setIsMetaModalOpen,
    openMetaModal,
    handleSaveMeta,
  }
}
