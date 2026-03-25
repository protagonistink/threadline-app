import { EditorialRow } from './EditorialRow';
import { EditorialSegmentedControl } from './EditorialSegmentedControl';
import { EditorialComingSoon } from './EditorialComingSoon';

interface StoryViewProps {
  narrativeStyle: string;
  setNarrativeStyle: (v: string) => void;
  storyDepth: string;
  setStoryDepth: (v: string) => void;
  tone: string;
  setTone: (v: string) => void;
  accountabilityLevel: string;
  setAccountabilityLevel: (v: string) => void;
}

export function StoryView(props: StoryViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-5xl md:text-6xl text-text-emphasis tracking-tight font-light mb-4 font-serif">
          Ink's <span className="italic text-text-secondary">Voice</span>
        </h2>
        <p className="text-text-secondary text-sm tracking-wide">Shape the personality, tone, and depth of your daily narratives.</p>
      </div>

      <div className="border-t border-solid border-border">
        <EditorialRow kicker="Format" title="Narrative Style" description="Controls how your daily recap and morning plans are written out.">
          <EditorialSegmentedControl
            options={[
              { value: 'concise', label: 'Concise' },
              { value: 'practical', label: 'Practical' },
              { value: 'reflective', label: 'Reflective' },
              { value: 'screenwriter', label: 'Beat Sheet' },
            ]}
            value={props.narrativeStyle}
            onChange={props.setNarrativeStyle}
          />
        </EditorialRow>

        <EditorialRow kicker="Format" title="Story Depth" description="Determine the length and detail of Ink's daily summaries.">
          <EditorialSegmentedControl
            options={[
              { value: 'summary', label: 'Summary' },
              { value: 'chapters', label: 'Chapters' },
              { value: 'full', label: 'Full Recap' },
            ]}
            value={props.storyDepth}
            onChange={props.setStoryDepth}
          />
        </EditorialRow>

        <EditorialRow kicker="Personality" title="Tone & Delivery" description="The emotional resonance of Ink's messages to you.">
          <EditorialSegmentedControl
            options={[
              { value: 'direct', label: 'Direct' },
              { value: 'encouraging', label: 'Encouraging' },
              { value: 'blunt', label: 'Blunt' },
              { value: 'coach', label: 'Coach' },
            ]}
            value={props.tone}
            onChange={props.setTone}
          />
        </EditorialRow>

        <EditorialRow kicker="Personality" title="Accountability Level" description="How strictly Ink holds you to missed obligations.">
          <EditorialSegmentedControl
            options={[
              { value: 'gentle', label: 'Gentle' },
              { value: 'firm', label: 'Firm' },
              { value: 'blunt', label: "Tell me what I'm avoiding" },
            ]}
            value={props.accountabilityLevel}
            onChange={props.setAccountabilityLevel}
          />
        </EditorialRow>

        <EditorialComingSoon items={[
          'Morning vs evening output formats',
          'Energy level input shaping',
          'Work context (Solo, Agency, Hybrid)',
          'Creativity slider (Literal vs Metaphorical)',
          'Action vs reflection bias',
        ]} />
      </div>
    </div>
  );
}
