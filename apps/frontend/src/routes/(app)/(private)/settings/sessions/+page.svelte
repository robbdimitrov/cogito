<script lang="ts">
  import { resolve } from "$app/paths";
  import { enhance } from "$app/forms";
  import { ArrowLeft, AlertCircle, XCircle, Monitor, X } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { pageTitle } from "$lib/shared/pageTitle";
  import { getToastContext } from "$lib/shared/toast.svelte";

  let { data, form } = $props();

  const toast = getToastContext();

  let deletingSessionId = $state<string | null>(null);

  let optimisticDeletedSessions = $state<Set<string>>(new Set());
  let sessions = $derived(
    data.sessions?.filter(
      (s) => s.id && !optimisticDeletedSessions.has(s.id),
    ) || [],
  );
</script>

<svelte:head>
  <title>{pageTitle("Active Sessions")}</title>
</svelte:head>

<GlassCard>
  <div class="card-body gap-4 p-4 sm:gap-5 sm:p-6">
    <div class="subtle-border flex items-start gap-3 border-b pb-4">
      <a
        href={resolve("/settings")}
        class="btn btn-ghost btn-circle btn-sm shrink-0"
        aria-label="Back to Settings"
        title="Back to Settings"
      >
        <ArrowLeft class="size-4" aria-hidden="true" />
      </a>
      <div class="grid gap-0.5">
        <h1 class="text-xl font-semibold leading-tight sm:text-2xl">
          Active Sessions
        </h1>
        <p class="muted-text text-sm">
          Review browsers signed in to your account and revoke ones you don't
          recognize.
        </p>
      </div>
    </div>

    {#if data.error || form?.error}
      <div class="alert alert-error" role="alert">
        <AlertCircle class="size-5 shrink-0" aria-hidden="true" />
        <span>{form?.error || data.error}</span>
      </div>
    {:else if !sessions || sessions.length === 0}
      <div
        class="flex flex-col items-center py-12 text-center text-base-content/70"
      >
        <XCircle
          class="mb-2 size-12 text-base-content opacity-60"
          aria-hidden="true"
        />
        <p class="text-base">No active sessions found.</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table w-full">
          <caption class="sr-only"
            >Active browser sessions for your account</caption
          >
          <thead>
            <tr class="border-base-200/80">
              <th scope="col" class="text-sm font-semibold text-base-content/70"
                >Device</th
              >
              <th scope="col" class="text-sm font-semibold text-base-content/70"
                >Created</th
              >
              <th scope="col" class="text-sm font-semibold text-base-content/70"
                >Actions</th
              >
            </tr>
          </thead>
          <tbody>
            {#each sessions as session (session.id)}
              {@const isCurrent =
                data.currentSessionId && session.id === data.currentSessionId}
              <tr class="border-base-200/70">
                <td>
                  <div class="flex min-h-12 items-center gap-3">
                    <span
                      class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
                    >
                      <Monitor class="size-4" aria-hidden="true" />
                    </span>
                    <span class="text-base font-medium">Browser</span>
                    {#if isCurrent}
                      <span class="badge badge-primary badge-sm">Current</span>
                    {/if}
                  </div>
                </td>
                <td class="text-sm text-base-content/70"
                  >{new Date(session.created ?? "").toLocaleString()}</td
                >
                <td>
                  {#if !isCurrent}
                    <form
                      method="POST"
                      action="?/deleteSession"
                      use:enhance={() => {
                        deletingSessionId = session.id;
                        optimisticDeletedSessions.add(session.id);

                        return async ({ result, update }) => {
                          deletingSessionId = null;
                          if (result.type === "failure") {
                            optimisticDeletedSessions.delete(session.id);
                          } else if (result.type === "success") {
                            toast.success("Session terminated");
                          }
                          await update({ invalidateAll: false });
                        };
                      }}
                    >
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <button
                        type="submit"
                        class="btn btn-error btn-sm btn-ghost min-h-10 gap-2 rounded-lg"
                        disabled={deletingSessionId === session.id}
                        aria-label="Terminate browser session"
                      >
                        {#if deletingSessionId === session.id}
                          <span class="loading loading-spinner loading-xs"
                          ></span>
                        {:else}
                          <X class="size-4" aria-hidden="true" />
                        {/if}
                        Terminate
                      </button>
                    </form>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</GlassCard>
