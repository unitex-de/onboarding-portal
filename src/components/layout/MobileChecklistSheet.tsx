import { X } from "lucide-react";
import { ChecklistContent } from "./RightChecklist";

interface MobileChecklistSheetProps {
  onClose: () => void;
  onInviteClick?: () => void;
}

export function MobileChecklistSheet({ onClose, onInviteClick }: MobileChecklistSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 xl:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden max-h-[85dvh] flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="font-display font-semibold text-foreground">Checkliste</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-popover/60 transition-colors"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ChecklistContent
            onInviteClick={onInviteClick}
            onNavigate={onClose}
          />
        </div>
      </div>
    </>
  );
}
