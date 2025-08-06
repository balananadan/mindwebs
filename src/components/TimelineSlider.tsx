'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Switch, Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { format, subDays, addDays, addHours, startOfDay } from 'date-fns';
import { useMapStore } from '@/store/useMapStore';

const TimelineSlider: React.FC<{ initialRange?: [number, number] }> = ({ initialRange = [0, 24] }) => {
  const { timeRange, setTimeRange } = useMapStore();
  const [sliderMode, setSliderMode] = useState<'single' | 'range'>('single');
  const [isPlaying, setIsPlaying] = useState(false);
  const [range, setRange] = useState<[number, number]>(initialRange);

  // Always call hooks at the top level
  const [timeline, setTimeline] = useState<{
    today: Date;
    startDate: Date;
    endDate: Date;
    totalHours: number;
  } | null>(null);

  // Provide fallback values for hooks that depend on timeline
  const startDate = timeline?.startDate ?? new Date();
  const endDate = timeline?.endDate ?? new Date();
  const totalHours = timeline?.totalHours ?? 24 * 30;

  // --- FIX: Store timeline dates in state, initialize on client only ---
  useEffect(() => {
    const today = new Date();
    const startDate = startOfDay(subDays(today, 15));
    const endDate = startOfDay(addDays(today, 15));
    const totalHours = 24 * 30;
    setTimeline({ today, startDate, endDate, totalHours });
  }, []);
  // ---------------------------------------------------------------------

  // Convert date to hour index
  const dateToHourIndex = useCallback(
    (date: Date): number => {
      const diffMs = date.getTime() - startDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60));
    },
    [startDate]
  );

  // Convert hour index to date
  const hourIndexToDate = useCallback(
    (index: number): Date => {
      return addHours(startDate, index);
    },
    [startDate]
  );

  // Current slider values
  const [sliderValue, setSliderValue] = useState<number | [number, number]>(() => {
    if (sliderMode === 'single') {
      return dateToHourIndex(timeRange.start);
    } else {
      return [dateToHourIndex(timeRange.start), dateToHourIndex(timeRange.end)];
    }
  });

  // Update slider when timeRange changes
  useEffect(() => {
    if (!timeline) return;
    if (sliderMode === 'single') {
      setSliderValue(dateToHourIndex(timeRange.start));
    } else {
      setSliderValue([dateToHourIndex(timeRange.start), dateToHourIndex(timeRange.end)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, sliderMode, dateToHourIndex, timeline]);

  // Handle slider change
  const handleSliderChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setSliderValue(value as [number, number]);
    } else {
      setSliderValue(value);
    }

    if (sliderMode === 'single' && typeof value === 'number') {
      const newDate = hourIndexToDate(value);
      setTimeRange({
        start: newDate,
        end: newDate,
        mode: 'single',
      });
    } else if (sliderMode === 'range' && Array.isArray(value)) {
      setTimeRange({
        start: hourIndexToDate(value[0]),
        end: hourIndexToDate(value[1]),
        mode: 'range',
      });
    }
  };

  // Toggle between single and range mode
  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'range' : 'single';
    setSliderMode(newMode);

    if (newMode === 'single') {
      const currentHour = Array.isArray(sliderValue) ? sliderValue[0] : sliderValue;
      setSliderValue(currentHour);
      const newDate = hourIndexToDate(currentHour);
      setTimeRange({
        start: newDate,
        end: newDate,
        mode: 'single',
      });
    } else {
      const currentHour = Array.isArray(sliderValue) ? sliderValue[0] : sliderValue;
      const endHour = Math.min(currentHour + 24, totalHours - 1); // Default 24-hour range
      setSliderValue([currentHour, endHour]);
      setTimeRange({
        start: hourIndexToDate(currentHour),
        end: hourIndexToDate(endHour),
        mode: 'range',
      });
    }
  };

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setSliderValue((prev) => {
          if (sliderMode === 'single' && typeof prev === 'number') {
            const next = (prev + 1) % totalHours;
            const newDate = hourIndexToDate(next);
            setTimeRange({
              start: newDate,
              end: newDate,
              mode: 'single',
            });
            return next;
          } else if (sliderMode === 'range' && Array.isArray(prev)) {
            const range = prev[1] - prev[0];
            const nextStart = (prev[0] + 1) % (totalHours - range);
            const nextEnd = nextStart + range;
            setTimeRange({
              start: hourIndexToDate(nextStart),
              end: hourIndexToDate(nextEnd),
              mode: 'range',
            });
            return [nextStart, nextEnd];
          }
          return prev;
        });
      }, 500); // Update every 500ms
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, sliderMode, totalHours, setTimeRange, hourIndexToDate]);

  // Generate marks for the slider (show every 24 hours)
  const marks: Record<number, { label: string; style: React.CSSProperties }> = {};
  for (let i = 0; i < totalHours; i += 24) {
    const date = hourIndexToDate(i);
    marks[i] = {
      label: format(date, 'MM/dd'),
      style: { fontSize: '12px' },
    };
  }

  // Format current time display
  const formatTimeDisplay = () => {
    if (sliderMode === 'single') {
      return format(timeRange.start, 'MMM dd, yyyy HH:mm');
    } else {
      return `${format(timeRange.start, 'MMM dd, HH:mm')} - ${format(timeRange.end, 'MMM dd, HH:mm')}`;
    }
  };

  // Only return null after all hooks
  if (!timeline) return null;

  return (
    <Card className="mb-2"   styles={{ body: { padding: '12px 12px 8px 12px' } }}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Timeline</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="text-xs">Single</span>
              <Switch
                checked={sliderMode === 'range'}
                onChange={handleModeChange}
                size="small"
              />
              <span className="text-xs">Range</span>
            </div>
            <Button
              type="text"
              size="small"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause animation' : 'Play animation'}
            />
          </div>
        </div>

        {/* Current time display */}
        <div className="text-center">
          <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
            {formatTimeDisplay()}
          </div>
        </div>

        {/* Slider */}
        <div className="px-1 py-2">
          <Slider
            range={sliderMode === 'range'}
            min={0}
            max={totalHours - 1}
            value={sliderValue}
            onChange={handleSliderChange}
            marks={marks}
            step={1}
            trackStyle={sliderMode === 'range' ? { backgroundColor: '#1890ff', height: 4 } : { height: 4 }}
            handleStyle={{
              borderColor: '#1890ff',
              backgroundColor: '#1890ff',
              boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.2)',
              height: 16,
              width: 16,
            }}
            railStyle={{ backgroundColor: '#f0f0f0', height: 4 }}
            dotStyle={{ borderColor: '#d9d9d9', height: 8, width: 8 }}
            activeDotStyle={{ borderColor: '#1890ff' }}
          />
        </div>

        {/* Timeline info */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>{format(startDate, 'MMM dd, yyyy')}</span>
          <span>1h</span>
          <span>{format(endDate, 'MMM dd, yyyy')}</span>
        </div>
      </div>
    </Card>
  );
};

export default TimelineSlider;