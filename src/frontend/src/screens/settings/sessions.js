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
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body flex justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (props.sessionsError) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <div className="alert alert-error">
            <AlertCircle className="h-5 w-5" />
            <span>{props.sessionsError}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!props.sessions || props.sessions.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center text-base-content/60 py-12">
          <XCircle className="h-12 w-12 mb-2 opacity-50" />
          <p>No active sessions found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <h2 className="card-title mb-4">Active Sessions</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Device</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.sessions.map((session) => {
                const isCurrent = props.currentSessionId && session.id === props.currentSessionId;
                return (
                  <tr key={session.id}>
                    <td className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-base-content/60" />
                      Browser {isCurrent && <span className="badge badge-primary badge-sm">Current</span>}
                    </td>
                    <td>{new Date(session.created).toLocaleString()}</td>
                    <td>
                      {!isCurrent && (
                        <button
                          className="btn btn-error btn-xs btn-ghost gap-1"
                          onClick={() => props.deleteSession(session.id).then(() => props.fetchSessions())}
                        >
                          <X className="h-4 w-4" />
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
