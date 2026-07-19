<script lang="ts">
  let { children } = $props();
</script>

<div class="mx-auto w-full max-w-xl px-3 py-3 sm:px-4 sm:py-6">
  {@render children()}
</div>
