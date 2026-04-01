/**
 * Animation event editor component
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { AnimationEvent, AnimationInfo } from "./types";
import {
  ANIMEVENT_TYPE_CONFIG,
  formatAnimationEventType,
  formatTime,
  getAnimationEventDetails,
  getAnimationEventFlagLimit,
  getAnimationEventValueLabel,
  getAnimationEventValueOptions,
  isFlagEventType,
  isPlaySoundEventType,
  TICKS_PER_SECOND,
  type ModelSourceKind,
} from "./utils";

interface AnimationEventEditorProps {
  selectedAnimationInfo: AnimationInfo | null;
  selectedEvents: AnimationEvent[];
  selectedEventIndex: number | null;
  gameLabel?: string | null;
  modelSourceKind?: ModelSourceKind | null;
  onSelectEvent: (index: number) => void;
  onAddEvent: () => void;
  onUpdateEvent: (index: number, event: AnimationEvent) => void;
  onDeleteEvent: (index: number) => void;
}

export function AnimationEventEditor({
  selectedAnimationInfo,
  selectedEvents,
  selectedEventIndex,
  gameLabel,
  modelSourceKind,
  onSelectEvent,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: AnimationEventEditorProps) {
  if (!selectedAnimationInfo) {
    return (
      <p className="text-xs text-gray-400">
        Select an animation to edit its events.
      </p>
    );
  }

  const flagLimit = getAnimationEventFlagLimit(modelSourceKind, gameLabel);

  return (
    <div className="min-h-0 space-y-3">
      <div className="space-y-1">
        <span className="text-xs text-gray-300">Events</span>
        <p className="text-[10px] text-gray-500">
          Flags shown here are limited to {flagLimit} animation-addressable
          slots for this model family.
        </p>
        <p className="text-[10px] text-gray-500">
          Time uses the source animation tick scale: 30 ticks per second.
        </p>
        <p className="text-[10px] text-gray-500">
          {gameLabel
            ? `Sound names are resolved for ${gameLabel}.`
            : modelSourceKind === "3dmf"
              ? "3DMF uploads can resolve to Bugdom 1 or Nanosaur 1 sound names."
              : "Exact sound names need a game-loaded model; raw values still edit correctly."}
        </p>
      </div>

      {selectedEvents.length > 0 ? (
        <div className="w-full min-h-0">
          <div className="divide-y divide-gray-800">
            {selectedEvents.map((event, index) => {
              const type = Number.isFinite(event.type) ? event.type : 0;
              const valueOptions = getAnimationEventValueOptions(
                type,
                modelSourceKind,
                gameLabel,
              );
              const isFlagValue = isFlagEventType(type);
              const isSoundValue = isPlaySoundEventType(type);
              const useValueSelect =
                isFlagValue || (isSoundValue && valueOptions.length > 0);
              const valueLabel = getAnimationEventValueLabel(
                type,
                event.value,
                modelSourceKind,
                gameLabel,
              );
              const details = getAnimationEventDetails(
                type,
                event.value,
                modelSourceKind,
                gameLabel,
              );
              const selected = selectedEventIndex === index;
              const updateEvent = (patch: Partial<AnimationEvent>) => {
                onUpdateEvent(index, {
                  time: event.time,
                  type: event.type,
                  value: event.value,
                  ...patch,
                });
              };
              const handleTimeChange = (value: string) => {
                if (value.trim().length === 0) {
                  return;
                }
                const nextTime = Math.round(Number.parseFloat(value));
                if (!Number.isFinite(nextTime) || nextTime < 0) {
                  return;
                }
                updateEvent({ time: nextTime });
              };
              const handleTypeChange = (value: string) => {
                const nextType = Number.parseInt(value, 10);
                if (!Number.isFinite(nextType)) {
                  return;
                }
                const nextOptions = getAnimationEventValueOptions(
                  nextType,
                  modelSourceKind,
                  gameLabel,
                );
                const fallbackValue =
                  nextOptions.length > 0
                    ? Number.parseInt(nextOptions[0]?.value ?? "0", 10)
                    : event.value;
                updateEvent({
                  type: nextType,
                  value: Number.isFinite(fallbackValue) ? fallbackValue : 0,
                });
              };
              const handleValueChange = (value: string) => {
                if (value.trim().length === 0) {
                  return;
                }
                const nextValue = Number.parseInt(value, 10);
                if (!Number.isFinite(nextValue)) {
                  return;
                }
                updateEvent({ value: nextValue });
              };

              return (
                <div
                  key={index}
                  className={`space-y-3 px-3 py-3 text-xs ${
                    selected
                      ? "bg-blue-900/40 text-blue-100"
                      : "text-gray-200 hover:bg-gray-700/30"
                  }`}
                  onClick={() => onSelectEvent(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">
                        Event {index + 1}
                      </div>
                      <p className="truncate text-[11px] text-gray-400">
                        {formatAnimationEventType(type)}
                        {details ? ` • ${details}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEvent(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2">Delete</span>
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">
                        Time
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={event.time.toString()}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="h-8 w-full min-w-0 border-gray-600 bg-gray-700 text-white"
                      />
                      <p className="text-[10px] text-gray-500">
                        {formatTime(event.time / TICKS_PER_SECOND)}
                      </p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">
                        Type
                      </div>
                      <Select value={type.toString()} onValueChange={handleTypeChange}>
                        <SelectTrigger className="h-8 w-full min-w-0 border-gray-600 bg-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 border-gray-600 bg-gray-700 text-white">
                          {Object.entries(ANIMEVENT_TYPE_CONFIG).map(
                            ([value, config]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className="text-white focus:bg-gray-600"
                                title={`${config.label}: ${config.description} Supported in: ${config.supportedGames.join(", ")}`}
                              >
                                {value}: {config.label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-1">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">
                        Value
                      </div>
                      {useValueSelect ? (
                        <Select
                          value={event.value.toString()}
                          onValueChange={handleValueChange}
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 border-gray-600 bg-gray-700 text-white">
                            <SelectValue placeholder="Select value" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 border-gray-600 bg-gray-700 text-white">
                            {valueOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="text-white focus:bg-gray-600"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={event.value.toString()}
                          onChange={(e) => handleValueChange(e.target.value)}
                          className="h-8 w-full min-w-0 border-gray-600 bg-gray-700 text-white"
                        />
                      )}
                      <p className="break-words text-[10px] text-gray-500">
                        {valueLabel}
                        {details ? ` • ${details}` : ""}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">No animation events found.</p>
      )}

      <Button size="sm" className="w-full" onClick={onAddEvent}>
        Add Event
      </Button>
    </div>
  );
}
