import React from 'react';
import { Check, MessageSquare } from 'lucide-react';

type AuthHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

function AuthHero({eyebrow, title, description, points}: AuthHeroProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-secondary items-center justify-center p-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px'}} />
      <div className="relative text-center text-primary-content">
        <MessageSquare className="h-24 w-24 mx-auto mb-8 opacity-80" />
        <p className="text-sm font-semibold uppercase tracking-[0.24em] opacity-75 mb-3">{eyebrow}</p>
        <h1 className="text-4xl font-extrabold mb-4">{title}</h1>
        <p className="text-xl opacity-90 mb-8">{description}</p>
        <div className="space-y-4 text-left max-w-xs mx-auto">
          {points.map((point) => (
            <div key={point} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="h-4 w-4" />
              </div>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AuthHero;
