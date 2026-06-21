<script lang="ts">
  import "../app.css";
  import { setThemeContext } from "$lib/shared/theme.svelte";
  import { onMount } from "svelte";

  let { data, children } = $props();

  const theme = setThemeContext(() => data.theme);
  onMount(theme.start);
</script>

{@render children()}
