
export type ColorTheme = 'purple' | 'blue' | 'green' | 'orange';
export type CheckoutTemplate = 'simple' | 'modern';

export const COLOR_THEMES: Record<ColorTheme, {
  label: string;
  gradient: string;
  gradientBtn: string;
  accent: string;
  accentBg: string;
  ring: string;
  preview: string;
}> = {
  purple: {
    label: 'Roxo Premium',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
    gradientBtn: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-500',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/10 border-violet-500/20',
    ring: 'ring-violet-500/30',
    preview: 'from-violet-600/20 via-purple-600/10 to-transparent',
  },
  blue: {
    label: 'Azul Tech',
    gradient: 'from-blue-600 via-cyan-500 to-teal-400',
    gradientBtn: 'bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/10 border-cyan-500/20',
    ring: 'ring-cyan-500/30',
    preview: 'from-blue-600/20 via-cyan-500/10 to-transparent',
  },
  green: {
    label: 'Verde Sucesso',
    gradient: 'from-emerald-600 via-green-500 to-lime-400',
    gradientBtn: 'bg-gradient-to-r from-emerald-600 via-green-500 to-lime-400',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10 border-emerald-500/20',
    ring: 'ring-emerald-500/30',
    preview: 'from-emerald-600/20 via-green-500/10 to-transparent',
  },
  orange: {
    label: 'Laranja Conversão',
    gradient: 'from-orange-500 via-amber-500 to-yellow-400',
    gradientBtn: 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/10 border-amber-500/20',
    ring: 'ring-amber-500/30',
    preview: 'from-orange-500/20 via-amber-500/10 to-transparent',
  },
};

export function getTheme(colorTheme: string) {
  return COLOR_THEMES[(colorTheme as ColorTheme)] || COLOR_THEMES.purple;
}
