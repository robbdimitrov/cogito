<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
</script>

<div class="p-4 text-center">
  <p>
    Redirecting to <a href={resolve("/settings/profile")} class="link"
      >Profile Settings</a
    >...
  </p>
</div>
