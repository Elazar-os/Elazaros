import * as stringSimilarity from 'string-similarity';

export type VoiceIntent = 
  | { type: 'theme'; theme: string }
  | { type: 'disable'; itemName: string }
  | { type: 'enable'; itemName: string }
  | { type: 'price'; itemName: string; price: string }
  | { type: 'campfire'; action: 'on' | 'off' }
  | { type: 'succah'; action: 'on' | 'off' }
  | { type: 'closing'; action: 'on' | 'off' }
  | { type: 'birthday'; action: 'on' | 'off'; name: string }
  | { type: 'kids'; action: 'on' | 'off' }
  | { type: 'volume'; volume: number }
  | { type: 'unknown'; raw: string };

export function parseVoiceCommand(raw: string): VoiceIntent {
  const command = raw.toLowerCase().replace(/hey gary,?\s*/i, '').trim();
  
  if (detectThemeIntent(command)) {
    return { type: 'theme', theme: extractTheme(command) };
  }

  if (detectBirthdayIntent(command)) {
    return { type: 'birthday', action: extractBirthdayAction(command), name: extractBirthdayName(command) };
  }

  if (detectKidsIntent(command)) {
    return { type: 'kids', action: extractKidsAction(command) };
  }
  
  if (detectSuccahIntent(command)) {
    return { type: 'succah', action: extractSuccahAction(command) };
  }

  if (detectCampfireIntent(command)) {
    return { type: 'campfire', action: extractCampfireAction(command) };
  }
  
  if (detectClosingIntent(command)) {
    return { type: 'closing', action: extractClosingAction(command) };
  }
  
  if (detectVolumeIntent(command)) {
    return { type: 'volume', volume: extractVolume(command) };
  }
  
  if (detect86Intent(command)) {
    const itemName = extractItemName86(command);
    return { type: 'disable', itemName };
  }
  
  if (detectEnableIntent(command)) {
    const itemName = extractItemNameEnable(command);
    return { type: 'enable', itemName };
  }
  
  if (detectPriceIntent(command)) {
    const { itemName, price } = extractPriceInfo(command);
    return { type: 'price', itemName, price };
  }
  
  return { type: 'unknown', raw: command };
}

function detectThemeIntent(cmd: string): boolean {
  return /switch\s*(to)?\s*(the)?\s*\w+\s*theme/i.test(cmd) ||
         /change\s*(to)?\s*(the)?\s*\w+\s*theme/i.test(cmd) ||
         /(sushi|classic|modern|high\s*contrast|delancey|fast)/i.test(cmd) && /theme|mode|style/i.test(cmd);
}

function extractTheme(cmd: string): string {
  if (/sushi|modern/i.test(cmd)) return 'modernSushi';
  if (/classic|delancey/i.test(cmd)) return 'delanceyClassic';
  if (/high\s*contrast|fast|yellow/i.test(cmd)) return 'highContrastFast';
  return 'delanceyClassic';
}

function detectBirthdayIntent(cmd: string): boolean {
  return /\bbirthday\b/i.test(cmd);
}

function extractBirthdayAction(cmd: string): 'on' | 'off' {
  if (/\b(stop|cancel|clear|end|off|done)\b/i.test(cmd)) return 'off';
  return 'on';
}

function extractBirthdayName(cmd: string): string {
  let name = cmd
    .replace(/\b(hey gary|play|start|put on|put up|show|happy)\b/gi, '')
    .replace(/\b(birthday|table|song|clip|music|audio)\b/gi, '')
    .replace(/\b(for|to|the|please|can you|could you)\b/gi, '')
    .replace(/\b(stop|cancel|clear|end|off|done)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) return 'Happy Birthday';
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function detectKidsIntent(cmd: string): boolean {
  return /\bkids?\s*(mode|hour|menu)\b/i.test(cmd) || /\b(kid mode|kids hour)\b/i.test(cmd);
}

function extractKidsAction(cmd: string): 'on' | 'off' {
  if (/\b(off|stop|end|cancel|clear|done)\b/i.test(cmd)) return 'off';
  return 'on';
}

function detectSuccahIntent(cmd: string): boolean {
  return /\b(succah|sukkah|succa|succos|sukkot|sukkos)\b/i.test(cmd);
}

function extractSuccahAction(cmd: string): 'on' | 'off' {
  if (/\b(off|stop|hide|disable|end|clear)\b/i.test(cmd)) return 'off';
  return 'on';
}

function detectCampfireIntent(cmd: string): boolean {
  return /\b(campfire|camp fire|fire|flame|flames)\b/i.test(cmd);
}

function extractCampfireAction(cmd: string): 'on' | 'off' {
  if (/\b(on|start|light|show|enable|back)\b/i.test(cmd)) return 'on';
  if (/\b(off|stop|extinguish|out|hide|disable|kill)\b/i.test(cmd)) return 'off';
  return 'on';
}

function detectClosingIntent(cmd: string): boolean {
  return /\bclosing\s*time\b/i.test(cmd) ||
         /\b(close|closing)\b/i.test(cmd) && /\b(store|shop|restaurant|time|music|song|audio)\b/i.test(cmd) ||
         /\b(end of day|shut down)\b/i.test(cmd) ||
         /\bplay\s+(the\s+)?closing\b/i.test(cmd) ||
         /\b(shut off|turn off|stop)\b/i.test(cmd) && /\b(music|song|audio|closing)\b/i.test(cmd);
}

function extractClosingAction(cmd: string): 'on' | 'off' {
  if (/\b(cancel|reopen|open the store|open store)\b/i.test(cmd)) return 'off';
  return 'on';
}
