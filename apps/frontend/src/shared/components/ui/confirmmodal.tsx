import {cx, glassCardClasses} from './surface';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className={cx("modal-box max-w-sm p-6", glassCardClasses)}>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="py-4 text-slate-600 dark:text-slate-300">{message}</p>
        <div className="modal-action">
          <button className="btn btn-ghost rounded-xl" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn btn-error rounded-xl" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel}>
        <button className="cursor-default">close</button>
      </div>
    </div>
  );
}
