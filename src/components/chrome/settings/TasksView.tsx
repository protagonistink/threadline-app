import { EditorialRow } from './EditorialRow';
import { EditorialSegmentedControl } from './EditorialSegmentedControl';
import { EditorialComingSoon } from './EditorialComingSoon';

interface TasksViewProps {
  priorityRule: string;
  setPriorityRule: (v: string) => void;
  notificationIntensity: string;
  setNotificationIntensity: (v: string) => void;
  distractionFiltering: string;
  setDistractionFiltering: (v: string) => void;
}

export function TasksView(props: TasksViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Tasks & <span className="italic text-text-secondary">Attention</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Configure how Ink prioritizes and presents your daily obligations.</p>
      </div>

      <div className="border-t border-solid border-border">
        <EditorialRow kicker="Priority Rules" title="Schedule Optimization" description="Dictates how automated blocks are arranged when your schedule is fluid. 'Energy' weights heavy tasks to your peak hours.">
          <EditorialSegmentedControl
            options={[
              { value: 'deadlines', label: 'Deadlines' },
              { value: 'energy', label: 'Energy' },
              { value: 'revenue', label: 'Revenue' },
              { value: 'balanced', label: 'Balanced' },
            ]}
            value={props.priorityRule}
            onChange={props.setPriorityRule}
          />
        </EditorialRow>

        <EditorialRow kicker="ADHD Support" title="Notification Intensity" description="Adjusts the frequency and firmness of task reminders and focus prompts.">
          <EditorialSegmentedControl
            options={[
              { value: 'minimal', label: 'Minimal' },
              { value: 'standard', label: 'Standard' },
              { value: 'high', label: 'High Support' },
            ]}
            value={props.notificationIntensity}
            onChange={props.setNotificationIntensity}
          />
        </EditorialRow>

        <EditorialRow kicker="Focus Control" title="Distraction Filtering" description="Limits the visibility of future or low-priority tasks to reduce overwhelm.">
          <EditorialSegmentedControl
            options={[
              { value: 'show_all', label: 'Show All' },
              { value: 'top_priorities', label: 'Top 3' },
              { value: 'today_only', label: 'Today Only' },
            ]}
            value={props.distractionFiltering}
            onChange={props.setDistractionFiltering}
          />
        </EditorialRow>

        <EditorialComingSoon items={[
          'Nudge type — passive prompts vs active alerts',
          'Task-initiation help — auto-break first task into tiny steps',
          'Focus mode windows — scheduled deep-work periods',
          'Lead-gen reminder frequency',
        ]} />
      </div>
    </div>
  );
}
