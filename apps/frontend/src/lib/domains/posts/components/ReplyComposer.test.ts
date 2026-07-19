import { describe, it, expect, vi, afterEach } from "vitest";
import { mountComponent } from "$lib/shared/testing/mountComponent";
import ReplyComposer from "./ReplyComposer.svelte";
import type { User, Post } from "$lib/shared/types";

const currentUser: User = {
  id: 1,
  name: "Alice",
  username: "alice",
  email: "",
  bio: "",
  posts: 0,
  replies: 0,
  likes: 0,
  following: 0,
  followers: 0,
  followed: false,
  created: "",
};

const replyToPost: Post = {
  publicId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  content: "hi",
  userId: 3,
  created: "",
  likes: 0,
  reposts: 0,
  replies: 0,
};

function pressEnter(
  textarea: HTMLTextAreaElement,
  extra: KeyboardEventInit = {},
) {
  textarea.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      ...extra,
    }),
  );
}

describe("ReplyComposer Enter-to-submit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits on plain Enter when content is non-empty", () => {
    const el = mountComponent(ReplyComposer, { currentUser, replyToPost });
    const textarea = el.querySelector("textarea")!;
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});

    textarea.value = "hello";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    pressEnter(textarea);

    expect(requestSubmit).toHaveBeenCalledOnce();
  });

  it("does not submit on Shift+Enter, so a newline can be inserted", () => {
    const el = mountComponent(ReplyComposer, { currentUser, replyToPost });
    const textarea = el.querySelector("textarea")!;
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});

    textarea.value = "hello";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    pressEnter(textarea, { shiftKey: true });

    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Enter when content is empty", () => {
    const el = mountComponent(ReplyComposer, { currentUser, replyToPost });
    const textarea = el.querySelector("textarea")!;
    const requestSubmit = vi
      .spyOn(HTMLFormElement.prototype, "requestSubmit")
      .mockImplementation(() => {});

    pressEnter(textarea);

    expect(requestSubmit).not.toHaveBeenCalled();
  });
});
