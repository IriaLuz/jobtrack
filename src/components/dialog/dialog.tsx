import { useEffect, useId, useRef, type ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A modal built on the native <dialog> element: the browser provides the focus trap, Escape to
 * close, the backdrop and screen reader semantics. It is open for as long as it is mounted.
 */
export const Dialog = ({ title, onClose, children }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="relative m-auto max-h-[calc(100svh-2rem)] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-(--border) bg-(--surface-raised) p-6 text-(--text) backdrop:bg-black/60"
    >
      <h2 id={titleId} className="mb-4 pr-8 text-lg">
        {title}
      </h2>
      {children}
      {/* Last in the DOM so the browser focuses the first field when the dialog opens, not this button. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 rounded-md px-2 text-2xl leading-none hover:text-(--text-h)"
      >
        ×
      </button>
    </dialog>
  );
};
