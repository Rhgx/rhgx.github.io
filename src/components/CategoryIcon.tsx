import type { Category } from '../data/projects';
import tc2Icon from '../assets/icons/tc2.webp';
import tf2Icon from '../assets/icons/tf2.webp';

// The game's own mark next to each section heading. "Other" has none.
export function CategoryIcon({ category }: { category: Category }) {
  switch (category) {
    case 'tc2':
      return <img className="game" src={tc2Icon} alt="" width={20} height={20} />;
    case 'tf2':
      return (
        <img
          className="game"
          src={tf2Icon}
          alt=""
          width={20}
          height={20}
          title="Team Fortress 2 icon by Valve, via Wikimedia Commons (CC BY-SA 4.0)"
        />
      );
    case 'roblox':
      // Roblox logo path from Simple Icons (CC0).
      return (
        <svg className="game roblox" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z"
          />
        </svg>
      );
    case 'other':
      return null;
  }
}
