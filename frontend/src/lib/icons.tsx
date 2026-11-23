import type { IconType } from 'react-icons';
import {
  PiHouseFill,
  PiCheckSquareFill,
  PiPlayFill,
  PiUsersFill,
  PiTrophyFill,
  PiPuzzlePieceFill,
  PiWalletFill,
  PiChartBarFill,
  PiGearFill,
  PiCardsFill,
  PiTriangleFill,
  PiGridFourFill,
  PiLinkSimpleFill,
  PiPaletteFill,
  PiTextAaFill,
  PiDropFill,
  PiBrainFill,
  PiHandshakeFill,
  PiCheckCircleFill,
  PiTimerFill,
  PiCheckFill,
  PiStarFill,
  PiBooksFill,
  PiIceCreamFill,
  PiTicketFill,
  PiGiftFill,
  PiPawPrintFill,
  PiTreeFill,
  PiEyeFill,
  PiPersonSimpleRunFill,
  PiMedalFill,
  PiDiamondFill,
  PiArrowCircleDownFill,
  PiArrowCircleUpFill,
  PiTrendUpFill,
  PiLightbulbFill,
  PiQuestionFill,
} from 'react-icons/pi';

/** Central registry mapping a semantic slug (stored in the mock-data JSON) to a
 *  react-icons component. Keeping the slug→icon lookup here — instead of in the
 *  data files — means data stays plain, serializable, and icon-library-agnostic. */
export const ICONS: Record<string, IconType> = {
  // nav / chrome
  home: PiHouseFill,
  'check-square': PiCheckSquareFill,
  play: PiPlayFill,
  users: PiUsersFill,
  trophy: PiTrophyFill,
  puzzle: PiPuzzlePieceFill,
  wallet: PiWalletFill,
  'chart-bar': PiChartBarFill,
  gear: PiGearFill,

  // games catalog
  cards: PiCardsFill,
  triangle: PiTriangleFill,
  grid: PiGridFourFill,
  link: PiLinkSimpleFill,
  palette: PiPaletteFill,
  text: PiTextAaFill,

  // habits
  water: PiDropFill,
  brain: PiBrainFill,
  handshake: PiHandshakeFill,
  'check-circle': PiCheckCircleFill,
  timer: PiTimerFill,
  check: PiCheckFill,
  star: PiStarFill,

  // rewards / wallet
  books: PiBooksFill,
  'ice-cream': PiIceCreamFill,
  ticket: PiTicketFill,
  gift: PiGiftFill,
  paw: PiPawPrintFill,
  tree: PiTreeFill,
  'arrow-down-circle': PiArrowCircleDownFill,
  'arrow-up-circle': PiArrowCircleUpFill,

  // focus mode
  eye: PiEyeFill,
  'person-run': PiPersonSimpleRunFill,

  // leagues
  medal: PiMedalFill,
  diamond: PiDiamondFill,

  // parent dashboard
  'trend-up': PiTrendUpFill,
  lightbulb: PiLightbulbFill,
};

/** Renders the icon registered under `name`, falling back to a question-mark
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
  const Cmp = ICONS[name] ?? PiQuestionFill;
  return <Cmp size={size} className={className} />;
}
