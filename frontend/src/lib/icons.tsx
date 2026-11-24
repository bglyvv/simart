import type { LucideIcon } from 'lucide-react';
import {
  Home,
  CheckSquare,
  Play,
  Users,
  Trophy,
  Puzzle,
  Wallet,
  BarChart3,
  Settings,
  Layers,
  Triangle,
  Grid3x3,
  Link as LinkIcon,
  Palette,
  Type,
  Droplet,
  Brain,
  Handshake,
  CheckCircle2,
  Timer,
  Check,
  Star,
  BookOpen,
  IceCream2,
  Ticket,
  Gift,
  PawPrint,
  TreePine,
  ArrowDownCircle,
  ArrowUpCircle,
  Eye,
  Footprints,
  Medal,
  Diamond,
  TrendingUp,
  Lightbulb,
  IdCard,
  Target,
  Bell,
  HelpCircle,
} from 'lucide-react';

/** Central registry mapping a semantic slug (stored in the mock-data JSON) to a
 *  Lucide icon component. Keeping the slug→icon lookup here — instead of in the
 *  data files — means data stays plain, serializable, and icon-library-agnostic.
 *  Consolidated onto a single outline icon set (Lucide) as part of the premium
 *  redesign — see new_design/DESIGN_SYSTEM.md §5 ("Simple Lucide icons"). This
 *  replaces the earlier deliberate lucide + react-icons/pi split. */
export const ICONS: Record<string, LucideIcon> = {
  // nav / chrome
  home: Home,
  'check-square': CheckSquare,
  play: Play,
  users: Users,
  trophy: Trophy,
  puzzle: Puzzle,
  family: IdCard,
  target: Target,
  bell: Bell,
  wallet: Wallet,
  'chart-bar': BarChart3,
  gear: Settings,

  // games catalog
  cards: Layers,
  triangle: Triangle,
  grid: Grid3x3,
  link: LinkIcon,
  palette: Palette,
  text: Type,

  // habits
  water: Droplet,
  brain: Brain,
  handshake: Handshake,
  'check-circle': CheckCircle2,
  timer: Timer,
  check: Check,
  star: Star,

  // rewards / wallet
  books: BookOpen,
  'ice-cream': IceCream2,
  ticket: Ticket,
  gift: Gift,
  paw: PawPrint,
  tree: TreePine,
  'arrow-down-circle': ArrowDownCircle,
  'arrow-up-circle': ArrowUpCircle,

  // focus mode
  eye: Eye,
  'person-run': Footprints,

  // leagues
  medal: Medal,
  diamond: Diamond,

  // parent dashboard
  'trend-up': TrendingUp,
  lightbulb: Lightbulb,
};

/** Renders the icon registered under `name`, falling back to a help-circle
 *  glyph (instead of throwing) if mock data ever references an unknown slug. */
export function Icon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Cmp = ICONS[name] ?? HelpCircle;
  return <Cmp size={size} className={className} />;
}
