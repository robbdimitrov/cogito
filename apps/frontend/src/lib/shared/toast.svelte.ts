import { getContext, setContext } from "svelte";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ToastController {
  readonly items: Toast[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  remove: (id: number) => void;
}

// Exported so tests can mount a component with a toast context directly
// (via mount()'s `context` option) without rendering a real ToastProvider.
export const TOAST_CONTEXT = Symbol("toast");
const TOAST_DURATION_MS = 3_000;

export function setToastContext(): ToastController {
  let items = $state<Toast[]>([]);
  let nextID = 0;

  function remove(id: number): void {
    items = items.filter((toast) => toast.id !== id);
  }

  function add(message: string, type: ToastType): void {
    const id = ++nextID;
    items = [...items, { id, message, type }];
    window.setTimeout(() => remove(id), TOAST_DURATION_MS);
  }

  const controller: ToastController = {
    get items() {
      return items;
    },
    success: (message) => add(message, "success"),
    error: (message) => add(message, "error"),
    info: (message) => add(message, "info"),
    remove,
  };
  setContext(TOAST_CONTEXT, controller);
  return controller;
}

export function getToastContext(): ToastController {
  const controller = getContext<ToastController | undefined>(TOAST_CONTEXT);
  if (!controller) {
    throw new Error("Toast context is unavailable");
  }
  return controller;
}
