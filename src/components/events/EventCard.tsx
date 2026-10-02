import React from 'react';
import { Calendar, MapPin, Users, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { EventItem } from '../../types';
import { Badge } from '../common/Badge';
import { formatDate } from '../../utils/formatters';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onRegister: (event: EventItem) => void;
  isOrganizerView?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  onRegister,
  isOrganizerView = false,
}) => {
  const percentFilled = Math.min(
    100,
    Math.round(((event.registeredCount || 0) / (event.capacity || 1)) * 100)
  );

  return (
    <div className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/10">
      {/* Banner */}
      <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
        <img
          src={event.banner}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge status={event.publishedStatus} />
          <span className="px-2 py-0.5 text-[11px] font-medium text-slate-200 bg-slate-900/80 backdrop-blur-xs border border-slate-700 rounded">
            {event.eventMode.replace('_', ' ')}
          </span>
          {event.isTeamEvent && (
            <span className="px-2 py-0.5 text-[11px] font-medium text-emerald-300 bg-emerald-950/80 backdrop-blur-xs border border-emerald-800/60 rounded flex items-center gap-1">
              <Users className="w-3 h-3" /> Team Event
            </span>
          )}
        </div>

        {/* Category Tag */}
        <div className="absolute bottom-2 left-3">
          <span className="text-[11px] font-mono font-medium text-emerald-400 uppercase tracking-wider">
            {event.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight line-clamp-1 group-hover:text-emerald-300 transition-colors">
            {event.name}
          </h3>
          <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Meta rows */}
          <div className="mt-4 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {formatDate(event.date)} • {event.startTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Capacity & Action */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          {/* Capacity Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                Capacity
              </span>
              <span className="text-slate-300 font-mono">
                {event.registeredCount} / {event.capacity} ({percentFilled}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentFilled >= 100
                    ? 'bg-rose-500'
                    : percentFilled >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => onSelect(event)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors"
            >
              Details
            </button>

            {isOrganizerView ? (
              <button
                onClick={() => onSelect(event)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 rounded-lg transition-colors"
              >
                Open Workspace
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onRegister(event)}
                disabled={event.publishedStatus === 'COMPLETED' || event.publishedStatus === 'CANCELLED'}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs"
              >
                Register
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
