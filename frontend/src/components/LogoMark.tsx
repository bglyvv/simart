import logoMark from '../assets/simart-logo.png';

/** The official SİMART wordmark, on its own transparent background. */
export default function LogoMark({ height = 36 }: { height?: number }) {
  return <img src={logoMark} alt="SİMART" style={{ height }} className="block w-auto shrink-0" />;
}
