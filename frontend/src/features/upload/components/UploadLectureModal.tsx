import { useMemo, useState } from "react"

import { ModalFrame } from "../../../components/layout"
import { uploadBoard } from "../../lectures/api"
import { FileDropZone } from "./FileDropZone"
import { OptionalPdfDropZone } from "./OptionalPdfDropZone"
import { UploadFormFields } from "./UploadFormFields"
import { UploadSubmitSection } from "./UploadSubmitSection"
import type { UploadFormState } from "../types"


interface UploadLectureModalProps {
  onClose: () => void
  onUploaded?: (boardId: number) => void
  initialLectureName?: string
}

const INITIAL_FORM: UploadFormState = {
  lectureName: "",
  topic: "",
  mediaFile: null,
  pdfFile: null,
  pdfAssetId: null,
}

export function UploadLectureModal({ onClose, onUploaded, initialLectureName }: UploadLectureModalProps) {
  const [form, setForm] = useState<UploadFormState>(() => {
    if (initialLectureName && initialLectureName.trim().length > 0) {
      return { ...INITIAL_FORM, lectureName: initialLectureName }
    }
    return INITIAL_FORM
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(form.mediaFile) && form.lectureName.trim().length > 0 && form.topic.trim().length > 0
  }, [form.lectureName, form.mediaFile, form.topic])

  function updateForm<Field extends keyof UploadFormState>(field: Field, value: UploadFormState[Field]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    const lectureName = form.lectureName.trim()
    const topic = form.topic.trim()

    if (!lectureName) {
      setErrorMessage("강의명은 필수입니다.")
      return
    }

    if (!topic) {
      setErrorMessage("강의 주제는 필수입니다.")
      return
    }

    if (!form.mediaFile) {
      setErrorMessage("미디어 파일은 필수입니다.")
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)
    setUploadProgress(0)
    try {
      const response = await uploadBoard({
        folderName: lectureName,
        boardTitle: topic,
        mediaFile: form.mediaFile,
        pdfFile: form.pdfFile,
        pdfAssetId: form.pdfAssetId ?? undefined,
        onUploadProgress: setUploadProgress,
      })

      onUploaded?.(response.board_id)
      onClose()
    } catch (error) {
      setUploadProgress(null)
      setErrorMessage(error instanceof Error ? error.message : "업로드 요청에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalFrame
      className="max-w-3xl p-8 md:p-10"
      description="강의 미디어를 업로드하면 AI가 텍스트 스크립트를 추출하고 동기화합니다."
      onClose={onClose}
      title="새 강의 업로드"
    >
      <div className="space-y-6">
        {errorMessage ? (
          <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        <UploadFormFields
          form={form}
          onChange={(field, value) => updateForm(field, value)}
        />
        <FileDropZone
          accept="video/*,audio/*"
          description="MP4, MKV, MP3, WAV 지원 (최대 2GB)"
          file={form.mediaFile}
          onFileSelect={(file) => updateForm("mediaFile", file)}
          title="스크립트를 추출할 영상 또는 음성 파일을 선택하세요"
        />
        <OptionalPdfDropZone
          file={form.pdfFile}
          onFileSelect={(file) => {
            // 파일 직접 업로드 선택 시 기존 라이브러리 선택 해제
            updateForm("pdfFile", file)
            updateForm("pdfAssetId", null)
          }}
          onLibrarySelect={(asset) => {
            // 라이브러리에서 선택한 경우 파일 필드는 비워두고 asset id를 설정
            updateForm("pdfFile", null)
            updateForm("pdfAssetId", asset ? asset.asset_id : null)
          }}
        />
        <UploadSubmitSection
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          uploadProgress={uploadProgress}
          onSubmit={handleSubmit}
        />
      </div>
    </ModalFrame>
  )
}
