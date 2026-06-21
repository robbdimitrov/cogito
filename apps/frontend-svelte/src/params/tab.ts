import type { ParamMatcher } from "@sveltejs/kit";

const TABS = new Set(["likes", "followers", "following"]);

export const match: ParamMatcher = (param) => TABS.has(param);
