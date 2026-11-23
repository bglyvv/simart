import { Link } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

const SCREENS = [
  { num: '01', title: 'Ailə Hesabının Yaradılması', path: '/qeydiyyat' },
  { num: '02', title: 'Uşaq Profilinin Əlavə Edilməsi', path: '/usaq-elave-et' },
  { num: '03', title: 'Ailə Hesabı & Valideyn Keçid Qapısı', path: '/aile-qapisi' },
  { num: '04', title: 'Gündəlik Vərdişlər', path: '/vərdişlər' },
  { num: '05', title: 'Animasiya Mərkəzi', path: '/animasiya' },
  { num: '06', title: 'Sağlamlıq Məhdudiyyəti (Focus Mode)', path: '/focus-mode' },
  { num: '07', title: 'Təhlükəsiz Sosial Mühit', path: '/sosial' },
  { num: '08', title: 'Liqalar və Mükafatlar', path: '/liqalar' },
  { num: '09', title: 'Zəka Oyunları Mərkəzi', path: '/oyunlar' },
  { num: '10', title: 'Valideyn Dashboard', path: '/analitika' },
  { num: '11', title: 'Uşaq Cüzdanı', path: '/cüzdan' },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-bg px-10 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center gap-3">
          <LogoMark height={44} />
          <div>
            <h1 className="font-display text-h2 font-bold text-text-900">SİMART</h1>
            <p className="text-text-500">Bütün 11 ekranın React implementasiyası</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SCREENS.map((s) => (
            <Link
              key={s.num}
              to={s.path}
              className="flex flex-col gap-2 rounded-lg border border-border-soft bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-body-sm font-bold text-purple-600">Ekran {s.num}</span>
              <span className="font-display font-semibold text-text-900">{s.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
