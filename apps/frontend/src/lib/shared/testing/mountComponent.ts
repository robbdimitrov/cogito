import { afterEach } from "vitest";
import { mount, unmount, flushSync, type Component } from "svelte";

let container: HTMLDivElement | undefined;
let instance: object | undefined;

afterEach(() => {
  if (instance) unmount(instance);
  container?.remove();
  container = undefined;
  instance = undefined;
});

export function mountComponent<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  instance = mount(component, { target: container, props });
  flushSync();
  return container;
}
