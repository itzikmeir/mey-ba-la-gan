interface Props {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  danger?: boolean
}

export function ConfirmModal({
  title, message, confirmLabel = 'אישור', cancelLabel = 'ביטול',
  onConfirm, onCancel, isLoading, danger,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-right">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 flex-row-reverse">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isLoading ? '...' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
