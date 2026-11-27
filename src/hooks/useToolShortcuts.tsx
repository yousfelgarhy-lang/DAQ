import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface RegisteredToolShortcuts {
  onExecute?: () => void;
  executeLabel?: string;
  onCopy?: () => void;
  copyLabel?: string;
}

interface ToolShortcutActionsContextValue {
  register: (config: RegisteredToolShortcuts) => void;
  clear: () => void;
  triggerExecute: () => boolean;
  triggerCopy: () => boolean;
}

const ToolShortcutStateContext = createContext<RegisteredToolShortcuts>({});
const ToolShortcutActionsContext = createContext<ToolShortcutActionsContextValue | null>(null);

export function ToolShortcutProvider({ children }: { children: ReactNode }) {
  const ref = useRef<RegisteredToolShortcuts>({});
  const [shortcuts, setShortcuts] = useState<RegisteredToolShortcuts>({});

  const register = useCallback((config: RegisteredToolShortcuts) => {
    ref.current = config;
    setShortcuts((prev) => {
      if (
        prev.executeLabel === config.executeLabel &&
        prev.copyLabel === config.copyLabel &&
        Boolean(prev.onExecute) === Boolean(config.onExecute) &&
        Boolean(prev.onCopy) === Boolean(config.onCopy)
      ) {
        return prev;
      }
      return {
        executeLabel: config.executeLabel,
        copyLabel: config.copyLabel,
        onExecute: config.onExecute,
        onCopy: config.onCopy,
      };
    });
  }, []);

  const clear = useCallback(() => {
    ref.current = {};
    setShortcuts((prev) =>
      Object.keys(prev).length === 0 ? prev : {}
    );
  }, []);

  const triggerExecute = useCallback(() => {
    if (ref.current.onExecute) {
      ref.current.onExecute();
      return true;
    }
    return false;
  }, []);

  const triggerCopy = useCallback(() => {
    if (ref.current.onCopy) {
      ref.current.onCopy();
      return true;
    }
    return false;
  }, []);

  const actionsValue = useMemo(
    () => ({ register, clear, triggerExecute, triggerCopy }),
    [register, clear, triggerExecute, triggerCopy]
  );

  return (
    <ToolShortcutActionsContext.Provider value={actionsValue}>
      <ToolShortcutStateContext.Provider value={shortcuts}>
        {children}
      </ToolShortcutStateContext.Provider>
    </ToolShortcutActionsContext.Provider>
  );
}

export function useToolShortcutContext() {
  const shortcuts = useContext(ToolShortcutStateContext);
  const actions = useContext(ToolShortcutActionsContext);
  return useMemo(() => {
    if (!actions) return null;
    return {
      shortcuts,
      ...actions,
    };
  }, [shortcuts, actions]);
}

export function useRegisterToolShortcuts(config: RegisteredToolShortcuts) {
  const actions = useContext(ToolShortcutActionsContext);
  const latestRef = useRef(config);
  latestRef.current = config;

  const hasExecute = Boolean(config.onExecute);
  const hasCopy = Boolean(config.onCopy);

  useEffect(() => {
    if (!actions) return;
    actions.register({
      executeLabel: config.executeLabel,
      copyLabel: config.copyLabel,
      onExecute: hasExecute ? () => latestRef.current.onExecute?.() : undefined,
      onCopy: hasCopy ? () => latestRef.current.onCopy?.() : undefined,
    });
  }, [actions, config.executeLabel, config.copyLabel, hasExecute, hasCopy]);

  useEffect(() => {
    if (!actions) return;
    return () => {
      actions.clear();
    };
  }, [actions]);
}

export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}
