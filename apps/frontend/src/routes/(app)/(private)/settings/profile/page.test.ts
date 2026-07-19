import { describe, it, expect, vi, afterEach } from "vitest";
import { flushSync } from "svelte";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import { TOAST_CONTEXT, type ToastController } from "$lib/shared/toast.svelte";
import type { User } from "$lib/domains/users/model";
import ProfilePage from "./+page.svelte";

interface SubmitInput {
  formElement: HTMLFormElement;
  formData: FormData;
  action: URL;
  cancel: () => void;
  submitter: HTMLElement | null;
}
type SubmitLifecycle = (opts: {
  result: { type: string; data?: Record<string, unknown> };
  update: (opts?: {
    reset?: boolean;
    invalidateAll?: boolean;
  }) => Promise<void>;
}) => Promise<void>;

const { formsState } = vi.hoisted(() => ({
  formsState: {
    submit: null as unknown as (input: SubmitInput) => SubmitLifecycle,
  },
}));
vi.mock("$app/forms", () => ({
  enhance: (_node: HTMLFormElement, submit: typeof formsState.submit) => {
    formsState.submit = submit;
    return { destroy() {} };
  },
}));

const stubToastController: ToastController = {
  items: [],
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  remove: () => {},
};
const toastContext = new Map([[TOAST_CONTEXT, stubToastController]]);

const currentUser: User = {
  id: 1,
  name: "Alice",
  username: "alice",
  email: "alice@example.com",
  bio: "",
  posts: 0,
  replies: 0,
  following: 0,
  followers: 0,
  likes: 0,
  followed: false,
};

function setValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Profile edit form save", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps name/username/email in the DOM after a successful save, since update() is called with reset: false", async () => {
    const el = mountComponent(
      ProfilePage,
      { data: { currentUser }, form: undefined },
      toastContext,
    );

    const nameInput = el.querySelector("#settings-name") as HTMLInputElement;
    const usernameInput = el.querySelector(
      "#settings-username",
    ) as HTMLInputElement;
    const emailInput = el.querySelector("#settings-email") as HTMLInputElement;

    setValue(nameInput, "Alice Updated");
    setValue(usernameInput, "alice2");
    setValue(emailInput, "alice2@example.com");
    flushSync();

    const formEl = el.querySelector("form") as HTMLFormElement;
    const lifecycle = formsState.submit({
      formElement: formEl,
      formData: new FormData(formEl),
      action: new URL("http://localhost/settings/profile"),
      cancel: vi.fn(),
      submitter: null,
    });

    // Mirrors SvelteKit's real `update()`: resets the form unless told not to.
    const fakeUpdate = vi.fn(async (opts?: { reset?: boolean }) => {
      if (opts?.reset !== false) formEl.reset();
    });
    await lifecycle({
      result: {
        type: "success",
        data: { profilePhotoKey: "", coverPhotoKey: "" },
      },
      update: fakeUpdate,
    });
    flushSync();

    expect(fakeUpdate).toHaveBeenCalledWith({
      invalidateAll: false,
      reset: false,
    });
    expect(nameInput.value).toBe("Alice Updated");
    expect(usernameInput.value).toBe("alice2");
    expect(emailInput.value).toBe("alice2@example.com");
  });
});
