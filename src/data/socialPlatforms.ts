export interface SocialPlatformConfig {
  id: string;
  name: string;
  category: 'professional' | 'messaging' | 'creator' | 'personal';
  color: string;
  placeholder: string;
  urlPrefix: string;
  formatUrl: (handle: string) => string;
}

export const MAJOR_SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  // Professional & Tech
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'professional',
    color: '#0A66C2',
    placeholder: 'https://linkedin.com/in/username or username',
    urlPrefix: 'linkedin.com/in/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://linkedin.com/in/${val.replace('@', '')}`),
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    category: 'professional',
    color: '#1DA1F2',
    placeholder: '@username or profile link',
    urlPrefix: 'x.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://x.com/${val.replace('@', '')}`),
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'professional',
    color: '#E6EDF3',
    placeholder: 'username or repo URL',
    urlPrefix: 'github.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://github.com/${val.replace('@', '')}`),
  },
  {
    id: 'calendly',
    name: 'Calendly',
    category: 'professional',
    color: '#006BFF',
    placeholder: 'calendly.com/your-name/30min',
    urlPrefix: 'calendly.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://calendly.com/${val}`),
  },

  // Direct Messaging
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'messaging',
    color: '#25D366',
    placeholder: '+1 (415) 555-0199',
    urlPrefix: 'wa.me/',
    formatUrl: (val) => `https://wa.me/${val.replace(/[^0-9]/g, '')}`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'messaging',
    color: '#229ED9',
    placeholder: '@username or t.me/channel',
    urlPrefix: 't.me/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://t.me/${val.replace('@', '')}`),
  },
  {
    id: 'signal',
    name: 'Signal',
    category: 'messaging',
    color: '#3A76F0',
    placeholder: 'Phone number or username.01',
    urlPrefix: 'signal.me/#p/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://signal.me/#p/${val}`),
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'messaging',
    color: '#5865F2',
    placeholder: 'username or invite code',
    urlPrefix: 'discord.gg/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://discord.com/users/${val}`),
  },
  {
    id: 'wechat',
    name: 'WeChat',
    category: 'messaging',
    color: '#07C160',
    placeholder: 'WeChat ID',
    urlPrefix: 'weixin://',
    formatUrl: (val) => `weixin://dl/chat?${val}`,
  },

  // Social & Visual Media
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'personal',
    color: '#E4405F',
    placeholder: '@username or profile link',
    urlPrefix: 'instagram.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://instagram.com/${val.replace('@', '')}`),
  },
  {
    id: 'threads',
    name: 'Threads',
    category: 'personal',
    color: '#FFFFFF',
    placeholder: '@username',
    urlPrefix: 'threads.net/@',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://threads.net/@${val.replace('@', '')}`),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'personal',
    color: '#1877F2',
    placeholder: 'facebook.com/username',
    urlPrefix: 'facebook.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://facebook.com/${val}`),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'personal',
    color: '#00F2FE',
    placeholder: '@creator',
    urlPrefix: 'tiktok.com/@',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://tiktok.com/@${val.replace('@', '')}`),
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    category: 'personal',
    color: '#FFFC00',
    placeholder: 'username',
    urlPrefix: 'snapchat.com/add/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://snapchat.com/add/${val.replace('@', '')}`),
  },

  // Content, Creator & Creative
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'creator',
    color: '#FF0000',
    placeholder: '@channel or video URL',
    urlPrefix: 'youtube.com/@',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://youtube.com/@${val.replace('@', '')}`),
  },
  {
    id: 'substack',
    name: 'Substack',
    category: 'creator',
    color: '#FF6719',
    placeholder: 'newsletter.substack.com',
    urlPrefix: '.substack.com',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://${val.replace('.substack.com', '')}.substack.com`),
  },
  {
    id: 'medium',
    name: 'Medium',
    category: 'creator',
    color: '#00AB6C',
    placeholder: '@writer or profile link',
    urlPrefix: 'medium.com/@',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://medium.com/@${val.replace('@', '')}`),
  },
  {
    id: 'behance',
    name: 'Behance',
    category: 'creator',
    color: '#1769FF',
    placeholder: 'behance.net/portfolio',
    urlPrefix: 'behance.net/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://behance.net/${val}`),
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    category: 'creator',
    color: '#EA4C89',
    placeholder: 'dribbble.com/designer',
    urlPrefix: 'dribbble.com/',
    formatUrl: (val) => (val.startsWith('http') ? val : `https://dribbble.com/${val}`),
  },
];
