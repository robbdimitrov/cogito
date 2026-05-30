import React, {createContext, useContext, useState, useCallback} from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({children}) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, {id, message, type}]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{success, error, info}}>
      {children}
      <div className="toast toast-top toast-end z-[100] gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({toast, onRemove}) {
  const alertClass = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
  }[toast.type] || 'alert-info';

  const icon = {
    success: (
      <CheckCircle className="h-5 w-5" />
    ),
    error: (
      <AlertCircle className="h-5 w-5" />
    ),
    info: (
      <Info className="h-5 w-5" />
    ),
  }[toast.type];

  return (
    <div className={`alert ${alertClass} shadow-lg text-sm py-2 px-4 gap-2 animate-slide-in`}>
      {icon}
      <span>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="btn btn-ghost btn-xs btn-circle opacity-50 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default ToastProvider;
