import React, { InputHTMLAttributes, TextareaHTMLAttributes, ElementType } from 'react';

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const glassSurfaceClasses = 'border border-white/60 bg-base-100/80 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30';
export const glassCardClasses = `card rounded-2xl ${glassSurfaceClasses}`;
export const interactiveGlassCardClasses = `${glassCardClasses} transition-colors duration-200 hover:bg-base-100/95 dark:hover:bg-slate-800/80`;
export const formInputClasses = 'input input-bordered min-h-12 w-full rounded-xl bg-base-100/30 text-base transition-all duration-300 focus:border-primary/60 focus:ring-4 focus:ring-primary/10';
export const formTextareaClasses = 'textarea textarea-bordered min-h-28 w-full rounded-xl bg-base-100/30 text-base leading-6 transition-all duration-300 focus:border-primary/60 focus:ring-4 focus:ring-primary/10';

interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: ElementType;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function GlassCard({as: Component = 'div', interactive = false, className = '', children, ...props}: GlassCardProps) {
  return (
    <Component className={cx(interactive ? interactiveGlassCardClasses : glassCardClasses, className)} {...props}>
      {children}
    </Component>
  );
}

interface FieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

export function Field({id, label, children}: FieldProps) {
  return (
    <div className="form-control">
      <label className="label" htmlFor={id}>
        <span className="label-text text-sm font-medium">{label}</span>
      </label>
      {children}
    </div>
  );
}

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function FormInput({className = '', ...props}: FormInputProps) {
  return <input className={cx(formInputClasses, className)} {...props} />;
}

interface FormTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function FormTextArea({className = '', ...props}: FormTextAreaProps) {
  return <textarea className={cx(formTextareaClasses, className)} {...props} />;
}

interface IconInputProps extends FormInputProps {
  icon: ElementType;
  iconClassName?: string;
}

export function IconInput({icon: Icon, className = '', iconClassName = '', ...props}: IconInputProps) {
  return (
    <div className="relative">
      <Icon className={cx('absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-base-content/40 pointer-events-none', iconClassName)} />
      <FormInput className={cx('pl-10', className)} {...props} />
    </div>
  );
}

export default GlassCard;
