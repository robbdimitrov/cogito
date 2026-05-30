import React, {useState, useEffect} from 'react';
import { AlertCircle, XCircle, Monitor, X } from 'lucide-react';

function Sessions(props) {
  const [isLoading, setIsLoading] = useState(true);
  const { fetchSessions } = props;

  useEffect(() => {
    setIsLoading(true);
    fetchSessions().finally(() => setIsLoading(false));
  }, [fetchSessions]);

  if (isLoading) {
    return (
      <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="card-body flex justify-center py-12" role="status" aria-live="polite">
          <span className="loading loading-spinner loading-lg" aria-label="Loading sessions"></span>
        </div>
      </div>
    );
  }

  if (props.sessionsError) {
    return (
      <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="card-body p-5 sm:p-6">
          <div className="alert alert-error" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{props.sessionsError}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!props.sessions || props.sessions.length === 0) {
    return (
      <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="card-body items-center text-center text-base-content/70 py-12">
          <XCircle className="h-12 w-12 mb-2 opacity-60" aria-hidden="true" />
          <p className="text-base">No active sessions found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
      <div className="card-body gap-5 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold leading-tight">Active Sessions</h1>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <caption className="sr-only">Active browser sessions for your account</caption>
            <thead>
              <tr className="border-base-200/80">
                <th scope="col" className="text-sm font-semibold text-base-content/70">Device</th>
                <th scope="col" className="text-sm font-semibold text-base-content/70">Created</th>
                <th scope="col" className="text-sm font-semibold text-base-content/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.sessions.map((session) => {
                const isCurrent = props.currentSessionId && session.id === props.currentSessionId;
                return (
                  <tr key={session.id} className="border-base-200/70">
                    <td>
                      <div className="flex min-h-12 items-center gap-3">
                        <Monitor className="h-5 w-5 shrink-0 text-base-content/60" aria-hidden="true" />
                        <span className="text-base font-medium">Browser</span>
                        {isCurrent && <span className="badge badge-primary badge-sm">Current</span>}
                      </div>
                    </td>
                    <td className="text-sm text-base-content/70">{new Date(session.created).toLocaleString()}</td>
                    <td>
                      {!isCurrent && (
                        <button
                          className="btn btn-error btn-sm btn-ghost min-h-10 gap-2 rounded-lg"
                          onClick={() => props.deleteSession(session.id).then(() => props.fetchSessions())}
                          aria-label="Terminate browser session"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Terminate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Sessions;
