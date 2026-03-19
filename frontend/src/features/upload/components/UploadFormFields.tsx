import type { UploadFormState } from "../types"

interface UploadFormFieldsProps {
  form: UploadFormState
  onChange: (field: keyof Pick<UploadFormState, "lectureName" | "topic">, value: string) => void
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-[var(--color-text-default)]">{label}</span>
      <input
        className="w-full rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[var(--color-text-strong)] outline-none transition-all placeholder:text-slate-400 focus:border-[var(--color-brand-400)] focus:bg-white"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  )
}

export function UploadFormFields({ form, onChange }: UploadFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field
        label="강의명"
        onChange={(value) => onChange("lectureName", value)}
        placeholder="예: 인공지능 입문"
        value={form.lectureName}
      />
      <Field
        label="세부 주제"
        onChange={(value) => onChange("topic", value)}
        placeholder="예: 머신러닝 기초"
        value={form.topic}
      />
    </div>
  )
}
