<script lang="ts">
  let { label = "Loading" }: { label?: string } = $props();
</script>

<div class="flex justify-center py-12" role="status">
  <span class="loading loading-spinner loading-lg text-primary"></span>
  <span class="sr-only">{label}</span>
</div>
