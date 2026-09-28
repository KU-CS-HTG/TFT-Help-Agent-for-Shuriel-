"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";

export const UNSAVED_CHANGES_MESSAGE = "저장하지 않은 내용이 있습니다. 계속하시겠습니까?";

interface UnsavedChangesContextValue {
  setDirty: (id: string, dirty: boolean) => void;
  hasUnsaved: () => boolean;
  confirmLeave: () => boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyIds = useRef(new Set<string>());

  const setDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyIds.current.add(id);
    else dirtyIds.current.delete(id);
  }, []);

  const hasUnsaved = useCallback(() => dirtyIds.current.size > 0, []);

  const confirmLeave = useCallback(() => {
    if (!hasUnsaved()) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  }, [hasUnsaved]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsaved()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsaved]);

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, hasUnsaved, confirmLeave }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) throw new Error("useUnsavedChanges는 UnsavedChangesProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

/** 컴포넌트가 "저장 안 된 변경사항이 있다"고 전역에 등록/해제하는 편의 훅 */
export function useRegisterDirty(id: string, dirty: boolean) {
  const { setDirty } = useUnsavedChanges();
  useEffect(() => {
    setDirty(id, dirty);
    return () => setDirty(id, false);
  }, [id, dirty, setDirty]);
}
