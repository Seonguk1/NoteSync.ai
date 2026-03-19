import { Info } from "lucide-react"

import { Button, ProgressBar } from "../../../components/ui"

interface UploadSubmitSectionProps {
  canSubmit: boolean
  isSubmitting: boolean
  uploadProgress: number | null
  onSubmit: () => void
}

export function UploadSubmitSection({ canSubmit, isSubmitting, uploadProgress, onSubmit }: UploadSubmitSectionProps) {
  const progressValue = uploadProgress ?? 0
  const progressMessage = progressValue >= 100 ? "전송 완료, 서버에서 처리 시작 중..." : `업로드 진행률 ${progressValue}%`

  return (
    <div className="space-y-4 pt-2">
      <Button className="h-14 w-full text-base shadow-lg shadow-[var(--color-brand-500)]/20" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
        {isSubmitting ? "업로드 중..." : "스크립트 추출 시작"}
      </Button>

      {isSubmitting ? (
        <div className="space-y-2">
          <ProgressBar value={progressValue} />
          <p className="text-center text-xs font-semibold text-[var(--color-brand-600)]">{progressMessage}</p>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Info className="h-3.5 w-3.5" />
        <span>파일 용량에 따라 추출에 수 분이 소요될 수 있습니다.</span>
      </div>
    </div>
  )
}
