import { Modal } from "./Modal";

export function ConfirmDialog({
  busy,
  confirmLabel = "Delete",
  danger = true,
  message,
  onCancel,
  onConfirm,
  title
}: {
  busy?: boolean;
  confirmLabel?: string;
  danger?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="modal-actions">
        <button className="icon-button" onClick={onCancel}>Cancel</button>
        <button className={danger ? "primary-button danger" : "primary-button"} disabled={busy} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
