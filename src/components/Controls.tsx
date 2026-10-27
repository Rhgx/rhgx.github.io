import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import { categories, type Category } from '../data/projects';

export type Filter = Category | 'all';

interface ControlsProps {
  query: string;
  onQueryChange: (query: string) => void;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...categories.map((c) => ({ id: c.id, label: c.short })),
];

export function Controls({ query, onQueryChange, filter, onFilterChange, searchRef }: ControlsProps) {
  return (
    <div className="controls">
      <label className="search">
        <Search aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onQueryChange('');
              e.currentTarget.blur();
            }
          }}
          placeholder="Search projects…"
          aria-label="Search projects"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd aria-hidden="true">/</kbd>
      </label>
      <div className="seg" role="group" aria-label="Filter by category">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            className={f.id === filter ? 'on' : undefined}
            aria-pressed={f.id === filter}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
