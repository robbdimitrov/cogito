<script lang="ts">
  import { enhance } from "$app/forms";
  import { AlertCircle, XCircle, Monitor, X } from "@lucide/svelte";
  import GlassCard from "$lib/shared/components/ui/GlassCard.svelte";
  import { getToastContext } from "$lib/shared/toast.svelte";

  let { data, form } = $props();

  const toast = getToastContext();

  let deletingSessionId = $state<string | null>(null);

  // Optimistic UI for sessions
  let optimisticDeletedSessions = $state<Set<string>>(new Set());
  let sessions = $derived(
    data.sessions?.filter(
      (s) => s.id && !optimisticDeletedSessions.has(s.id),
    ) || [],
  );
</script>

{#if data.error || form?.error}
  <GlassCard>
    <div class="card-body p-4 sm:p-6">
      <div class="alert alert-error" role="alert">
        <AlertCircle class="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{form?.error || data.error}</span>
      </div>
    </div>
  </GlassCard>
{:else if !sessions || sessions.length === 0}
  <GlassCard>
    <div class="card-body items-center text-center text-base-content/70 py-12">
      <XCircle class="h-12 w-12 mb-2 opacity-60" aria-hidden="true" />
      <p class="text-base">No active sessions found.</p>
    </div>
  </GlassCard>
{:else}
  <GlassCard>
    <div class="card-body gap-4 p-4 sm:gap-5 sm:p-6">
      <h1 class="text-xl font-semibold leading-tight sm:text-2xl">
        Active Sessions
      </h1>
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
                    <Monitor
                      class="h-5 w-5 shrink-0 text-base-content/60"
                      aria-hidden="true"
                    />
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
                          <X class="h-4 w-4" aria-hidden="true" />
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
    </div>
  </GlassCard>
{/if}
