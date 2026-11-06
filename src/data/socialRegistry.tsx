import React from 'react';
import {
  Linkedin,
  Twitter,
  Github,
  Calendar,
  MessageSquare,
  Instagram,
  Youtube,
  Facebook,
  Twitch,
  Music,
  Send,
  Globe,
  Radio,
} from 'lucide-react';
import { DigitalCard, MasterProfile, SocialAccountEntry, SocialLinks } from '../types';

export const TOP_5_SOCIAL_PLATFORM_IDS: (keyof SocialLinks)[] = [
  'linkedin',
  'instagram',
  'whatsapp',
  'twitter',
  'youtube',
];

export interface SocialPlatformConfig {
  id: keyof SocialLinks;
  name: string;
  category: 'professional' | 'personal' | 'creator_community';
  color: string;
  lightColor?: string;
  darkColor?: string;
  placeholder: string;
  urlPrefix?: string;
  renderIcon: (props: { className?: string; style?: React.CSSProperties }) => React.ReactNode;
}

export const MAJOR_SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  // 1. Professional & Business
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'professional',
    color: '#0A66C2',
    lightColor: '#0A66C2',
    darkColor: '#38BDF8',
    placeholder: 'https://linkedin.com/in/username or username',
    urlPrefix: 'https://linkedin.com/in/',
    renderIcon: ({ className, style }) => <Linkedin className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    category: 'professional',
    color: '#0284C7',
    lightColor: '#0F172A',
    darkColor: '#38BDF8',
    placeholder: '@username or https://x.com/username',
    urlPrefix: 'https://x.com/',
    renderIcon: ({ className, style }) => <Twitter className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'calendly',
    name: 'Calendly / Meeting',
    category: 'professional',
    color: '#006BFF',
    lightColor: '#006BFF',
    darkColor: '#60A5FA',
    placeholder: 'https://calendly.com/username/30min',
    renderIcon: ({ className, style }) => <Calendar className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'professional',
    color: '#6E5494',
    lightColor: '#181717',
    darkColor: '#F8FAFC',
    placeholder: 'https://github.com/username or username',
    urlPrefix: 'https://github.com/',
    renderIcon: ({ className, style }) => <Github className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'substack',
    name: 'Substack',
    category: 'professional',
    color: '#EA580C',
    lightColor: '#C2410C',
    darkColor: '#FB923C',
    placeholder: 'https://publication.substack.com',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
      </svg>
    ),
  },
  {
    id: 'medium',
    name: 'Medium',
    category: 'professional',
    color: '#059669',
    lightColor: '#047857',
    darkColor: '#34D399',
    placeholder: 'https://medium.com/@username',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
      </svg>
    ),
  },
  {
    id: 'behance',
    name: 'Behance',
    category: 'professional',
    color: '#1769FF',
    lightColor: '#1D4ED8',
    darkColor: '#60A5FA',
    placeholder: 'https://behance.net/username',
    urlPrefix: 'https://behance.net/',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-4.976 3-3.469 0-5.75-2.715-5.75-6 0-3.518 2.378-6 5.667-6 3.659 0 5.333 2.766 5.333 6.223 0 .422-.053.864-.093 1.109h-8.773c.092 1.639 1.411 2.868 3.033 2.868 1.488 0 2.348-.845 2.682-1.594l2.877.394zm-7.69-4.281h5.811c-.078-1.532-1.07-2.613-2.684-2.613-1.634 0-2.883 1.096-3.127 2.613zm-10.036 6.281h-6v-14h6.54c3.088 0 5.46 1.487 5.46 4.67 0 1.932-1.026 3.342-2.529 4.021 1.986.643 3.029 2.296 3.029 4.417 0 3.394-2.738 4.892-6.5 4.892zm-3.5-8.5h3.146c1.674 0 2.854-.64 2.854-2.128 0-1.464-1.121-2.072-2.717-2.072h-3.283v4.2zm0 6h3.402c1.867 0 3.198-.795 3.198-2.457 0-1.626-1.39-2.343-3.146-2.343h-3.454v4.8z" />
      </svg>
    ),
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    category: 'professional',
    color: '#EA4C89',
    lightColor: '#DB2777',
    darkColor: '#F472B6',
    placeholder: 'https://dribbble.com/username',
    urlPrefix: 'https://dribbble.com/',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm9.897 10.963a10.05 10.05 0 0 1-5.748-.063c-.15-.36-.312-.716-.484-1.066a18.3 18.3 0 0 0 6.232-.871zm-8.243-1.657a16.48 16.48 0 0 1 .452.996c-3.79 1.135-7.794 1.258-8.082 1.266a10.06 10.06 0 0 1 1.83-4.996 16.74 16.74 0 0 1 5.8 2.734zm-7.64 4.542c.38-.009 3.864-.117 7.42-1.168.497 1.34.908 2.73 1.226 4.14-3.76.994-6.388.08-6.496.042a10.06 10.06 0 0 1-2.15-3.014zm10.74 4.887a17.06 17.06 0 0 0-1.167-3.927c1.782-.29 3.842-.236 5.485.148a10.08 10.08 0 0 1-4.318 3.779zm4.848-5.762c-1.536-.35-3.504-.4-5.22-.132a18.25 18.25 0 0 0-.256-.54c2.05-.15 4.31-.05 5.476.672zm-7.653-5.06a14.88 14.88 0 0 0-5.187-2.457A10.04 10.04 0 0 1 12 1.95a10.05 10.05 0 0 1 7.15 3.003 16.27 16.27 0 0 0-5.201 2.96z" />
      </svg>
    ),
  },

  // 2. Personal & Messaging
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'personal',
    color: '#16A34A',
    lightColor: '#15803D',
    darkColor: '#25D366',
    placeholder: '+1 (415) 555-0199 or phone number',
    urlPrefix: 'https://wa.me/',
    renderIcon: ({ className, style }) => <MessageSquare className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'personal',
    color: '#0284C7',
    lightColor: '#0369A1',
    darkColor: '#38BDF8',
    placeholder: '@username or https://t.me/username',
    urlPrefix: 'https://t.me/',
    renderIcon: ({ className, style }) => <Radio className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'signal',
    name: 'Signal',
    category: 'personal',
    color: '#2563EB',
    lightColor: '#1D4ED8',
    darkColor: '#60A5FA',
    placeholder: '+1 (415) 555-0199 or signal.me/#p/...',
    urlPrefix: 'https://signal.me/#p/',
    renderIcon: ({ className, style }) => <Send className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'personal',
    color: '#E1306C',
    lightColor: '#C13584',
    darkColor: '#F43F5E',
    placeholder: '@username or https://instagram.com/username',
    urlPrefix: 'https://instagram.com/',
    renderIcon: ({ className, style }) => <Instagram className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'personal',
    color: '#1877F2',
    lightColor: '#1D4ED8',
    darkColor: '#60A5FA',
    placeholder: 'https://facebook.com/username or profile ID',
    urlPrefix: 'https://facebook.com/',
    renderIcon: ({ className, style }) => <Facebook className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    category: 'personal',
    color: '#D97706',
    lightColor: '#B45309',
    darkColor: '#FACC15',
    placeholder: 'username or https://snapchat.com/add/username',
    urlPrefix: 'https://snapchat.com/add/',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M12.016 2.012c-3.69 0-6.19 2.597-6.19 5.867 0 1.25.433 2.545.433 2.545s-.433.15-.99.333c-.558.183-1.077.56-1.077 1.107 0 .81.932 1.22 1.83 1.34.13.418.067.877-.168 1.488-.344.897-1.127 1.463-2.127 1.547-.323.027-.58.267-.58.59 0 .524.58.82 1.32.96 1.36.26 2.87-.24 3.73-.78.33-.21.75-.12 1.01.19.78.94 1.72 1.39 2.8 1.39 1.08 0 2.02-.45 2.8-1.39.26-.31.68-.4 1.01-.19.86.54 2.37 1.04 3.73.78.74-.14 1.32-.436 1.32-.96 0-.323-.257-.563-.58-.59-1-.084-1.783-.65-2.127-1.547-.235-.611-.298-1.07-.168-1.488.898-.12 1.83-.53 1.83-1.34 0-.547-.52-.924-1.077-1.107-.557-.183-.99-.333-.99-.333s.433-1.295.433-2.545c0-3.27-2.5-5.867-6.19-5.867z" />
      </svg>
    ),
  },
  {
    id: 'wechat',
    name: 'WeChat',
    category: 'personal',
    color: '#07C160',
    lightColor: '#15803D',
    darkColor: '#34D399',
    placeholder: 'WeChat ID or Phone',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M8.7 15.1c-.5 0-1-.1-1.5-.2l-2.6 1.4.7-2.3C4.1 13 3.5 11.6 3.5 10c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6-2.9 5.1-7.8 5.1zm-2.4-6.3c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm4.8 0c-.6 0-1 .4-1 1s.4 1 1 1 1-.4 1-1-.4-1-1-1zm9.3 5.4c0-2.8-2.4-5.1-5.4-5.1-.3 0-.6 0-.9.1 1.7 4.1.3 7.8-.8 8.8 1.1.2 2.2.3 3.1.3.4 0 .9-.1 1.3-.2l2.2 1.2-.6-1.9c.7-.9 1.1-2 1.1-3.2zm-6.2-1.1c-.5 0-.8.4-.8.8s.4.8.8.8.8-.4.8-.8-.4-.8-.8-.8zm3.6 0c-.5 0-.8.4-.8.8s.4.8.8.8.8-.4.8-.8-.3-.8-.8-.8z" />
      </svg>
    ),
  },

  // 3. Creator, Community & Entertainment
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'creator_community',
    color: '#DC2626',
    lightColor: '#DC2626',
    darkColor: '#F87171',
    placeholder: 'https://youtube.com/@channel or @channel',
    urlPrefix: 'https://youtube.com/@',
    renderIcon: ({ className, style }) => <Youtube className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'creator_community',
    color: '#0891B2',
    lightColor: '#0F172A',
    darkColor: '#22D3EE',
    placeholder: '@username or https://tiktok.com/@username',
    urlPrefix: 'https://tiktok.com/@',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 01-2.891 2.89 2.896 2.896 0 01-2.892-2.89 2.896 2.896 0 012.892-2.892c.32 0 .628.055.914.156V9.458a6.326 6.326 0 00-.914-.067 6.34 6.34 0 00-6.335 6.335A6.34 6.34 0 009.478 22a6.34 6.34 0 006.335-6.335v-6.91a8.212 8.212 0 004.996 1.685v-3.48a4.807 4.807 0 01-1.22-.274z" />
      </svg>
    ),
  },
  {
    id: 'threads',
    name: 'Threads',
    category: 'creator_community',
    color: '#4F46E5',
    lightColor: '#18181B',
    darkColor: '#F8FAFC',
    placeholder: '@username or https://threads.net/@username',
    urlPrefix: 'https://threads.net/@',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M12.186 24C5.466 24 0 18.57 0 11.905 0 5.24 5.466-.19 12.186-.19c6.64 0 12.04 5.34 12.174 11.96H21.57c-.13-5.06-4.23-9.17-9.384-9.17-5.21 0-9.43 4.19-9.43 9.305 0 5.115 4.22 9.305 9.43 9.305 4.385 0 8.083-2.98 9.096-7.07h-9.096v-2.61h11.988c.036.43.054.87.054 1.32 0 7.02-5.466 12.15-12.042 12.15z" />
      </svg>
    ),
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'creator_community',
    color: '#5865F2',
    lightColor: '#4F46E5',
    darkColor: '#818CF8',
    placeholder: 'username#0000 or discord.gg/invite',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.893.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'creator_community',
    color: '#EA580C',
    lightColor: '#C2410C',
    darkColor: '#FB923C',
    placeholder: 'u/username or https://reddit.com/u/username',
    urlPrefix: 'https://reddit.com/u/',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'creator_community',
    color: '#9146FF',
    lightColor: '#7C3AED',
    darkColor: '#A78BFA',
    placeholder: 'https://twitch.tv/username or username',
    urlPrefix: 'https://twitch.tv/',
    renderIcon: ({ className, style }) => <Twitch className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'spotify',
    name: 'Spotify / Podcast',
    category: 'creator_community',
    color: '#16A34A',
    lightColor: '#15803D',
    darkColor: '#22C55E',
    placeholder: 'https://open.spotify.com/artist/... or /show/...',
    renderIcon: ({ className, style }) => <Music className={className || 'h-4 w-4'} style={style} />,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    category: 'creator_community',
    color: '#E60023',
    lightColor: '#BE123C',
    darkColor: '#FB7185',
    placeholder: 'https://pinterest.com/username or @username',
    urlPrefix: 'https://pinterest.com/',
    renderIcon: ({ className, style }) => (
      <svg className={className || 'h-4 w-4'} viewBox="0 0 24 24" fill="currentColor" style={style}>
        <path d="M12 0a12 12 0 0 0-4.37 23.17c-.07-.63-.13-1.6.03-2.29l1-4.24s-.26-.51-.26-1.27c0-1.19.69-2.08 1.55-2.08.73 0 1.08.55 1.08 1.21 0 .74-.47 1.84-.71 2.87-.2.86.43 1.56 1.28 1.56 1.53 0 2.71-1.61 2.71-3.94 0-2.06-1.48-3.5-3.6-3.5-2.45 0-3.89 1.84-3.89 3.73 0 .74.28 1.53.64 1.96a.25.25 0 0 1 .06.24c-.06.27-.21.86-.24.98-.04.16-.14.2-.32.12-1.2-.56-1.95-2.31-1.95-3.72 0-3.03 2.2-5.81 6.35-5.81 3.33 0 5.92 2.37 5.92 5.55 0 3.31-2.09 5.98-4.99 5.98-.97 0-1.89-.51-2.2-1.11l-.6 2.29c-.22.84-.81 1.89-1.21 2.53A12 12 0 1 0 12 0z" />
      </svg>
    ),
  },
];

export function getPlatformConfig(platformId: keyof SocialLinks): SocialPlatformConfig {
  return (
    MAJOR_SOCIAL_PLATFORMS.find((p) => p.id === platformId) ||
    MAJOR_SOCIAL_PLATFORMS[0]
  );
}

/**
 * Normalizes user input into a clickable URL
 */
export function getFullSocialUrl(platformId: keyof SocialLinks, rawValue: string): string {
  const config = MAJOR_SOCIAL_PLATFORMS.find((p) => p.id === platformId);
  const trimmed = (rawValue || '').trim();

  if (!trimmed) {
    if (config?.urlPrefix) {
      return config.urlPrefix.replace(/\/(in|add|u|#p)\/?$/, '/').replace(/\/@$/, '/');
    }
    const defaultUrls: Partial<Record<keyof SocialLinks, string>> = {
      calendly: 'https://calendly.com',
      substack: 'https://substack.com',
      wechat: 'https://web.wechat.com',
      discord: 'https://discord.com',
      spotify: 'https://open.spotify.com',
    };
    return defaultUrls[platformId] || `https://${platformId}.com`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (!config) return `https://${trimmed}`;

  if (platformId === 'whatsapp') {
    const cleanPhone = trimmed.replace(/[^0-9]/g, '');
    return cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/';
  }

  if (platformId === 'telegram') {
    const cleanTag = trimmed.replace('@', '');
    return `https://t.me/${cleanTag}`;
  }

  if (platformId === 'signal') {
    const cleanPhone = trimmed.replace(/[^0-9]/g, '');
    return cleanPhone ? `https://signal.me/#p/${cleanPhone}` : 'https://signal.me/';
  }

  if (config.urlPrefix) {
    const cleanHandle = trimmed.replace(/^[@/]/, '');
    return `${config.urlPrefix}${cleanHandle}`;
  }

  return `https://${trimmed}`;
}

/**
 * Gets the stored value of a social link from a MasterProfile, checking personalData, workData, and root socials
 */
export function getProfileSocialValue(profile: MasterProfile, platformId: keyof SocialLinks): string {
  return (
    profile.personalData?.socials?.[platformId] ||
    profile.workData?.socials?.[platformId] ||
    profile.socials?.[platformId] ||
    ''
  );
}

/**
 * Returns the ordered list of SocialAccountEntry lines to display in the Master Profile Editor:
 * - If profile.socialAccounts is already populated, returns it directly.
 * - Otherwise, returns the Top 5 social platforms by default, plus any other platform
 *   that already has a non-empty value in the profile so no existing data is hidden.
 */
export function getEffectiveSocialAccounts(profile: MasterProfile): SocialAccountEntry[] {
  if (profile.socialAccounts && profile.socialAccounts.length > 0) {
    return profile.socialAccounts;
  }

  const entries: SocialAccountEntry[] = [];
  const addedPlatforms = new Set<keyof SocialLinks>();

  // 1. Always start with the Top 5 platforms
  for (const platformId of TOP_5_SOCIAL_PLATFORM_IDS) {
    entries.push({
      id: `social-${platformId}`,
      platformId,
      value: getProfileSocialValue(profile, platformId),
    });
    addedPlatforms.add(platformId);
  }

  // 2. Include any additional platform that already has a non-empty value in the profile
  for (const platform of MAJOR_SOCIAL_PLATFORMS) {
    if (!addedPlatforms.has(platform.id)) {
      const val = getProfileSocialValue(profile, platform.id);
      if (val && val.trim()) {
        entries.push({
          id: `social-${platform.id}`,
          platformId: platform.id,
          value: val,
        });
        addedPlatforms.add(platform.id);
      }
    }
  }

  return entries;
}

/**
 * Returns only the social account lines that have a non-empty value filled by the user.
 */
export function getFilledSocialAccounts(profile: MasterProfile): SocialAccountEntry[] {
  return getEffectiveSocialAccounts(profile).filter((entry) => Boolean(entry.value?.trim()));
}

/**
 * Determines whether a specific SocialAccountEntry is visible on a DigitalCard.
 */
export function isSocialAccountVisible(
  card: DigitalCard | undefined,
  entry: SocialAccountEntry
): boolean {
  if (!card) return true;
  if (card.visibleFields.socials === false) return false;
  if (
    card.visibleFields.socialAccounts &&
    typeof card.visibleFields.socialAccounts[entry.id] === 'boolean'
  ) {
    return card.visibleFields.socialAccounts[entry.id];
  }
  return Boolean(card.visibleFields[entry.platformId]);
}

/**
 * Syncs the array of SocialAccountEntry items back to legacy SocialLinks for backward compatibility.
 */
export function syncSocialAccountsToLegacyLinks(
  entries: SocialAccountEntry[]
): SocialLinks {
  const nextSocials: SocialLinks = {};
  for (const entry of entries) {
    const trimmed = (entry.value || '').trim();
    if (trimmed && !nextSocials[entry.platformId]) {
      nextSocials[entry.platformId] = trimmed;
    }
  }
  return nextSocials;
}

