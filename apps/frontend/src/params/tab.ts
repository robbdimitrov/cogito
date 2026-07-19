import type { ParamMatcher } from "@sveltejs/kit";

const TABS = new Set(["replies", "likes", "followers", "following"]);

export const match: ParamMatcher = (param) => TABS.has(param);
