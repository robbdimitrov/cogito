import { getContext, setContext } from "svelte";

export interface ComposeController {
  open: () => void;
}

const COMPOSE_CONTEXT = Symbol("compose");

export function setComposeContext(controller: ComposeController): void {
  setContext(COMPOSE_CONTEXT, controller);
}

export function getComposeContext(): ComposeController {
  const controller = getContext<ComposeController | undefined>(COMPOSE_CONTEXT);
  if (!controller) {
    throw new Error("Compose context is unavailable");
  }
  return controller;
}
