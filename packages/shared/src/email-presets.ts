export interface EmailPresetConfig {
  host: string;
  port: number;
  secure?: boolean;
  tls?: boolean;
}

export interface EmailProviderPreset {
  label: string;
  smtp: EmailPresetConfig;
  imap: EmailPresetConfig;
  note?: string;
}

export const EMAIL_PROVIDER_PRESETS: Record<string, EmailProviderPreset> = {
  gmail: {
    label: 'Gmail / Google Workspace',
    smtp: { host: 'smtp.gmail.com', port: 587, secure: false },
    imap: { host: 'imap.gmail.com', port: 993, tls: true },
    note: '需要使用应用专用密码（App Password）',
  },
  outlook: {
    label: 'Outlook / Office 365',
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    imap: { host: 'outlook.office365.com', port: 993, tls: true },
    note: '需要开启 SMTP/IMAP 访问',
  },
  qq: {
    label: 'QQ 邮箱',
    smtp: { host: 'smtp.qq.com', port: 465, secure: true },
    imap: { host: 'imap.qq.com', port: 993, tls: true },
    note: '需要使用授权码',
  },
  '163': {
    label: '163 邮箱',
    smtp: { host: 'smtp.163.com', port: 465, secure: true },
    imap: { host: 'imap.163.com', port: 993, tls: true },
    note: '需要开启 SMTP/IMAP 并使用授权码',
  },
  '126': {
    label: '126 邮箱',
    smtp: { host: 'smtp.126.com', port: 465, secure: true },
    imap: { host: 'imap.126.com', port: 993, tls: true },
    note: '需要开启 SMTP/IMAP 并使用授权码',
  },
  aliyun: {
    label: '阿里企业邮箱',
    smtp: { host: 'smtp.qiye.aliyun.com', port: 465, secure: true },
    imap: { host: 'imap.qiye.aliyun.com', port: 993, tls: true },
  },
  tencent: {
    label: '腾讯企业邮箱',
    smtp: { host: 'smtp.exmail.qq.com', port: 465, secure: true },
    imap: { host: 'imap.exmail.qq.com', port: 993, tls: true },
  },
};

export const EMAIL_DOMAIN_PRESET_MAP: Record<string, keyof typeof EMAIL_PROVIDER_PRESETS> = {
  'gmail.com': 'gmail',
  'googlemail.com': 'gmail',
  'outlook.com': 'outlook',
  'hotmail.com': 'outlook',
  'live.com': 'outlook',
  'qq.com': 'qq',
  '163.com': '163',
  '126.com': '126',
  'aliyun.com': 'aliyun',
  'exmail.qq.com': 'tencent',
};

export const EMAIL_PROVIDER_OPTIONS = [
  { value: 'auto', label: '自动识别（根据邮箱地址）' },
  ...Object.entries(EMAIL_PROVIDER_PRESETS).map(([value, item]) => ({ value, label: item.label })),
  { value: 'custom', label: '自定义配置' },
];

export function resolveEmailProvider(email: string, provider?: string): { key: string | undefined; preset?: EmailProviderPreset } {
  const domain = email.split('@')[1]?.toLowerCase();

  if (provider && provider !== 'auto') {
    if (provider === 'custom') {
      return { key: 'custom' };
    }
    return { key: provider, preset: EMAIL_PROVIDER_PRESETS[provider] };
  }

  if (domain) {
    const presetKey = EMAIL_DOMAIN_PRESET_MAP[domain];
    if (presetKey) {
      return { key: presetKey, preset: EMAIL_PROVIDER_PRESETS[presetKey] };
    }
  }

  return { key: undefined };
}

export function buildSmtpConfig(email: string, password: string, preset?: EmailPresetConfig) {
  return {
    host: preset?.host || '',
    port: preset?.port || 587,
    user: email,
    password,
    secure: preset?.secure ?? false,
  };
}

export function buildImapConfig(email: string, password: string, preset?: EmailPresetConfig) {
  return {
    host: preset?.host || '',
    port: preset?.port || 993,
    user: email,
    password,
    tls: preset?.tls ?? true,
  };
}
