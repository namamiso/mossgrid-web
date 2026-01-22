import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { getHabitDay, getYearDates, isFutureDay, parseDate } from '../utils/habitDay';

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function GrassCalendar() {
  const { selectedDate, setSelectedDate, getCompletionRate } = useStore();
  const today = getHabitDay();
  const [displayYear, setDisplayYear] = useState(() => parseInt(today.split('-')[0]));

  // Generate calendar data
  const calendarData = useMemo(() => {
    const dates = getYearDates(displayYear);
    const weeks: (string | null)[][] = [];

    // Get the day of week for Jan 1
    const firstDay = parseDate(dates[0]).getDay();

    // Fill in empty cells before Jan 1
    let currentWeek: (string | null)[] = new Array(firstDay).fill(null);

    for (const date of dates) {
      const dayOfWeek = parseDate(date).getDay();

      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(date);
    }

    // Fill in remaining cells
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);

    return weeks;
  }, [displayYear]);

  // Get month label positions
  const monthPositions = useMemo(() => {
    const positions: { month: number; weekIndex: number }[] = [];
    let lastMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      const firstDate = week.find(d => d !== null);
      if (firstDate) {
        const month = parseInt(firstDate.split('-')[1]) - 1;
        if (month !== lastMonth) {
          positions.push({ month, weekIndex });
          lastMonth = month;
        }
      }
    });

    return positions;
  }, [calendarData]);

  const getColor = (rate: number, isFuture: boolean): string => {
    if (isFuture) return 'bg-gray-100 dark:bg-gray-800';
    if (rate === 0) return 'bg-gray-200 dark:bg-gray-700';
    if (rate <= 0.25) return 'bg-green-200 dark:bg-green-900';
    if (rate <= 0.5) return 'bg-green-400 dark:bg-green-700';
    if (rate <= 0.75) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const goToToday = () => {
    const todayYear = parseInt(today.split('-')[0]);
    setDisplayYear(todayYear);
    setSelectedDate(today);
  };

  return (
    <div className="px-8 py-6">
      {/* Year navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDisplayYear(y => y - 1)}
            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            &lt;
          </button>
          <span className="text-lg font-bold min-w-16 text-center">{displayYear}</span>
          <button
            onClick={() => setDisplayYear(y => y + 1)}
            className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            &gt;
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex mb-1 h-4">
            <div className="w-8" /> {/* Spacer for weekday labels */}
            <div className="flex relative" style={{ width: calendarData.length * 13 }}>
              {monthPositions.map(({ month, weekIndex }) => (
                <span
                  key={`${month}-${weekIndex}`}
                  className="absolute text-xs text-gray-500"
                  style={{ left: weekIndex * 13 }}
                >
                  {MONTH_LABELS[month]}
                </span>
              ))}
            </div>
          </div>

          {/* Grid with weekday labels */}
          <div className="flex">
            {/* Weekday labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={i} className="h-3 text-xs text-gray-500 leading-3">{label}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="flex gap-0.5">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {week.map((date, dayIndex) => {
                    if (!date) {
                      return <div key={dayIndex} className="w-3 h-3" />;
                    }

                    const future = isFutureDay(date);
                    const rate = future ? 0 : getCompletionRate(date);
                    const isSelected = date === selectedDate;

                    return (
                      <button
                        key={date}
                        onClick={() => !future && setSelectedDate(date)}
                        disabled={future}
                        className={`w-3 h-3 rounded-sm ${getColor(rate, future)} ${
                          isSelected ? 'ring-2 ring-blue-500' : ''
                        } ${future ? 'cursor-not-allowed' : 'cursor-pointer hover:ring-1 hover:ring-gray-400'}`}
                        title={`${date}: ${Math.round(rate * 100)}%`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
