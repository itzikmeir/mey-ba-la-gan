interface Props {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
      <div className="flex-1">
        <p className="text-red-700 text-sm font-medium">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 text-lg leading-none">
          ×
        </button>
      )}
    </div>
  )
}
