import type { ParamMatcher } from "@sveltejs/kit";

const USERNAME_PATTERN = /^@?[A-Za-z0-9_]{3,30}$/;

export const match: ParamMatcher = (param) => USERNAME_PATTERN.test(param);
