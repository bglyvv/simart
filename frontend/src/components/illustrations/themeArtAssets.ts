import kid from '../../assets/theme-illustrated/kid.webp';
import kids from '../../assets/theme-illustrated/kids.webp';
import bell from '../../assets/theme-illustrated/bell.webp';
import trophy from '../../assets/theme-illustrated/trophy.webp';
import giftBig from '../../assets/theme-illustrated/gift-big.webp';
import xpStar from '../../assets/theme-illustrated/xp-star.webp';
import flame from '../../assets/theme-illustrated/flame.webp';
import coins from '../../assets/theme-illustrated/coins.webp';
import calendar from '../../assets/theme-illustrated/calendar.webp';
import wallet from '../../assets/theme-illustrated/wallet.webp';
import videoBoy from '../../assets/theme-illustrated/video-boy.webp';
import readingKids from '../../assets/theme-illustrated/reading-kids.webp';
import tierBronze from '../../assets/theme-illustrated/tier-bronze.webp';
import tierSilver from '../../assets/theme-illustrated/tier-silver.webp';
import tierGold from '../../assets/theme-illustrated/tier-gold.webp';
import tierDiamond from '../../assets/theme-illustrated/tier-diamond.webp';
import rewardIceCream from '../../assets/theme-illustrated/r-icecream.webp';
import rewardBooks from '../../assets/theme-illustrated/r-books.webp';
import rewardGift from '../../assets/theme-illustrated/r-gift.webp';
import rewardPark from '../../assets/theme-illustrated/r-park.webp';
import avatarLion from '../../assets/theme-illustrated/avatar-lion.webp';
import avatarFox from '../../assets/theme-illustrated/avatar-fox.webp';
import avatarBunny from '../../assets/theme-illustrated/avatar-bunny.webp';
import avatarBear from '../../assets/theme-illustrated/avatar-bear.webp';

/**
 * Artwork for the "İllüstrasiyalı" theme: cut from the designer's
 * illustration sheet (transparent background), upscaled 4x with Real-ESRGAN
 * and stored at 2x their source size as WebP. Pages size them by CSS height.
 */
export const THEME_ART = {
  kid,
  kids,
  bell,
  trophy,
  giftBig,
  xpStar,
  flame,
  coins,
  calendar,
  wallet,
  videoBoy,
  readingKids,
} as const;

export type ThemeArtName = keyof typeof THEME_ART;

/** Index-aligned with LEAGUE_TIERS (Bürünc, Gümüş, Qızıl, Almaz). */
export const TIER_ART = [tierBronze, tierSilver, tierGold, tierDiamond];

/** Keyed by a reward's `icon` slug, with the pastel tile each sits on. */
export const REWARD_ART: Record<string, { src: string; tile: string }> = {
  'ice-cream': { src: rewardIceCream, tile: '#fde8f1' },
  books: { src: rewardBooks, tile: '#e4f0fe' },
  gift: { src: rewardGift, tile: '#efe9ff' },
  ticket: { src: rewardPark, tile: '#e6f6e4' },
};

/** Illustrated versions of the avatar emoji the app offers (see
 * familyAuth.json's avatarOptions); any other emoji stays an emoji. */
export const AVATAR_ART: Record<string, string> = {
  '🦁': avatarLion,
  '🦊': avatarFox,
  '🐰': avatarBunny,
  '🐻': avatarBear,
};
