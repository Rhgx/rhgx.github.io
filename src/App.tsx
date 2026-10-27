import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, ArrowRight } from 'lucide-react';
import { archived, categories, projects, type Project } from './data/projects';
import { ShaderBackground } from './background/ShaderBackground';
import { Header } from './components/Header';
import { Controls, type Filter } from './components/Controls';
import { CategoryIcon } from './components/CategoryIcon';
import { ProjectCard } from './components/ProjectCard';

function filterFromHash(): Filter {
  const id = window.location.hash.slice(1);
  return categories.find((c) => c.id === id)?.id ?? 'all';
}

function matches(project: Project, term: string) {
  if (!term) return true;
  const haystack = [project.name, project.fullName, project.description, project.keywords ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(term);
}

export function App() {
  const [filter, setFilter] = useState<Filter>(filterFromHash);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();

  // Keep the active filter in the URL so a section can be linked (e.g. /#tf2).
  useEffect(() => {
    const onHashChange = () => setFilter(filterFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function changeFilter(next: Filter) {
    setFilter(next);
    const url = next === 'all' ? window.location.pathname + window.location.search : `#${next}`;
    window.history.replaceState(null, '', url);
  }

  // "/" jumps to search from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const sections = useMemo(
    () =>
      categories
        .filter((c) => filter === 'all' || c.id === filter)
        .map((c) => ({ ...c, items: projects.filter((p) => p.category === c.id && matches(p, term)) }))
        .filter((s) => s.items.length > 0),
    [filter, term],
  );

  const archivedMatches = useMemo(
    () =>
      term
        ? archived.filter((a) => `${a.name} ${a.keywords ?? ''}`.toLowerCase().includes(term))
        : [],
    [term],
  );

  const nothingFound = sections.length === 0 && archivedMatches.length === 0;

  return (
    <>
      <ShaderBackground />
      <div className="wrap">
        <Header />
        <Controls
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={changeFilter}
          searchRef={searchRef}
        />

        <main>
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={`h-${section.id}`}>
              <h2 id={`h-${section.id}`}>
                <CategoryIcon category={section.id} />
                {section.label} <span className="count">{section.items.length}</span>
              </h2>
              <div className="grid">
                {section.items.map((project) => (
                  <ProjectCard key={project.href} project={project} />
                ))}
              </div>
            </section>
          ))}

          {archivedMatches.length > 0 && (
            <section className="archived-hits" aria-labelledby="h-archived">
              <h2 id="h-archived">In the archive</h2>
              <ul>
                {archivedMatches.map((a) => (
                  <li key={a.slug}>
                    <a href={a.href ?? `/archives/${a.slug}/`}>{a.name}</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nothingFound && (
            <p className="empty">
              No projects match.{' '}
              <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }}>
                Clear search
              </button>
            </p>
          )}

          <a className="archive" href="/archives/">
            <Archive className="archive-icon" aria-hidden="true" />
            <b>Archive</b>
            <ArrowRight className="go" aria-hidden="true" />
          </a>
        </main>

        <footer>
          <span>Made by Rocks</span>
          <span className="mono">rhgx.github.io</span>
        </footer>
      </div>
    </>
  );
}
