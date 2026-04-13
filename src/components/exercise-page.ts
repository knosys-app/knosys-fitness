import type { SharedDependencies } from '../types';
import { createUseDiary } from '../hooks/use-fitness-store';
import { createExerciseLog } from './exercise-log';
import { createDateNavigator } from './date-navigator';
import { toDateKey } from '../utils/date-helpers';
import { formatCal } from '../utils/nutrients';

export function createExercisePage(Shared: SharedDependencies) {
  const { React, ScrollArea, Card, CardContent, lucideIcons } = Shared;
  const { Flame } = lucideIcons;

  const ExerciseLog = createExerciseLog(Shared);
  const DateNavigator = createDateNavigator(Shared);
  const useDiary = createUseDiary(Shared);

  return function ExercisePage() {
    const [date, setDate] = React.useState(new Date());
    const dateKey = toDateKey(date);
    const diary = useDiary(dateKey);

    const totalCal = diary.exercise.entries.reduce((sum, e) => sum + e.calories_burned, 0);
    const totalMin = diary.exercise.entries.reduce((sum, e) => sum + e.duration_min, 0);

    return React.createElement('div', { className: 'flex flex-col h-full' },
      // Header with date navigator
      React.createElement('div', { className: 'flex items-center justify-between px-4 py-3 border-b' },
        React.createElement(DateNavigator, { date, onDateChange: setDate }),
        React.createElement('div', { className: 'flex items-center gap-4 text-sm' },
          React.createElement('div', { className: 'flex items-center gap-1.5' },
            React.createElement(Flame, { className: 'h-4 w-4 text-orange-500' }),
            React.createElement('span', { className: 'font-semibold tabular-nums' }, formatCal(totalCal)),
            React.createElement('span', { className: 'text-muted-foreground text-xs' }, 'cal burned'),
          ),
          totalMin > 0 && React.createElement('span', { className: 'text-xs text-muted-foreground' },
            `· ${totalMin} min`,
          ),
        ),
      ),

      // Scrollable content
      React.createElement(ScrollArea, { className: 'flex-1' },
        React.createElement('div', { className: 'p-4 max-w-2xl mx-auto' },
          React.createElement(ExerciseLog, {
            exercise: diary.exercise,
            onAddExercise: diary.addExercise,
            onRemoveExercise: diary.removeExercise,
          }),
        ),
      ),
    );
  };
}
