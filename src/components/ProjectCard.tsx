import { ArrowUpRight } from 'lucide-react';
import type { Project } from '../data/projects';

export function ProjectCard({ project }: { project: Project }) {
  const { name, fullName, description, href, preview, icon, external } = project;

  return (
    <a
      className="card"
      href={href}
      title={fullName}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <div className="thumb">
        <img src={preview} alt="" width={480} height={300} loading="lazy" decoding="async" />
      </div>
      <div className="info">
        <div className="name">
          {icon && (
            <img
              className="icon"
              src={icon}
              alt=""
              width={16}
              height={16}
              // The icon lives on the linked site; if it ever goes missing, drop it instead of leaving a gap.
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          )}
          <span>{name}</span>
          {external && <ArrowUpRight className="ext" aria-label="Opens in a new tab" />}
        </div>
        <div className="desc">{description}</div>
      </div>
    </a>
  );
}
