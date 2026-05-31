interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmClearDialog({ onConfirm, onCancel }: Props) {
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        <h3 className="dialog__title">Clear all tile pixels?</h3>
        <p className="dialog__body">
          Changing the hex size clears all tile pixel data. You can undo this immediately with Ctrl+Z.
        </p>
        <div className="dialog__actions">
          <button className="btn btn--secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn--danger" onClick={onConfirm}>Clear and apply</button>
        </div>
      </div>
    </div>
  );
}
