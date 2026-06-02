interface FormFooterProps {
  saving: boolean
  saveLabel: string
  onCancel: () => void
  formId: string
}

export function FormFooter({ saving, saveLabel, onCancel, formId }: FormFooterProps) {
  return (
    <>
      <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button type="submit" form={formId} disabled={saving}>
        {saving ? <span className="inline-spinner" aria-label="Saving" /> : saveLabel}
      </button>
    </>
  )
}
