import { parseTheme } from "$lib/shared/theme";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ cookies }) => {
  return {
    theme: parseTheme(cookies.get("theme")),
  };
};
