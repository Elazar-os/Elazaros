import * as stringSimilarity from 'string-similarity';

export type VoiceIntent = 
  | { type: 'theme'; theme: string }
  | { type: 'disable'; itemName: string }
  | { type: 'enable'; itemName: string }
  | { type: 'price'; itemName: string; price: string }
  | { type: 'campfire'; action: 'on' | 'off' }
  | { type: 'closing'; action: 'on' | 'off' }
  | { type: 'volume'; volume: number }
  | { type: 'unknown'; raw: string };

export function parseVoiceCommand(raw: string): VoiceIntent {
  const command = raw.toLowerCase().replace(/hey gary,?\s*/i, '').trim();
  
  if (detectThemeIntent(command)) {
    return { type: 'theme', theme: extractTheme(command) };
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

function detectCampfireIntent(cmd: string): boolean {
  return /\b(campfire|fire)\b/i.test(cmd) && /\b(on|off|turn|start|stop|light|extinguish|shut)\b/i.test(cmd);
}

function extractCampfireAction(cmd: string): 'on' | 'off' {
  if (/\b(off|stop|extinguish|turn off|shut|shut off)\b/i.test(cmd)) return 'off';
  return 'on';
}

function detectClosingIntent(cmd: string): boolean {
  return (/\b(close|closing|shut down|end of day)\b/i.test(cmd) && /\b(store|shop|restaurant|time)\b/i.test(cmd)) ||
         /\b(shut off|turn off|stop)\b/i.test(cmd) && /\b(music|song|audio)\b/i.test(cmd);
}

function extractClosingAction(cmd: string): 'on' | 'off' {
  if (/\b(open|reopen|cancel|stop|shut off|turn off)\b/i.test(cmd)) return 'off';
  return 'on';
}

function detectVolumeIntent(cmd: string): boolean {
  return /\b(volume|louder|quieter|sound)\b/i.test(cmd) && /\d+/i.test(cmd);
}

function extractVolume(cmd: string): number {
  const match = cmd.match(/\b(\d+)\s*(?:%|percent)?\b/i);
  if (match) {
    return parseInt(match[1]);
  }
  return 50;
}

function detect86Intent(cmd: string): boolean {
  return /\b(86|eighty[\s-]?six|disable|turn off|remove)\b/i.test(cmd);
}

function extractItemName86(cmd: string): string {
  let item = cmd
    .replace(/\b(86|eighty[\s-]?six|disable|turn off|remove)\b/gi, '')
    .replace(/\b(the|item|please|can you|could you)\b/gi, '')
    .trim();
  return cleanItemName(item);
}

function detectEnableIntent(cmd: string): boolean {
  return /\b(bring back|enable|turn on|un[\s-]?86|add back)\b/i.test(cmd);
}

function extractItemNameEnable(cmd: string): string {
  let item = cmd
    .replace(/\b(bring back|enable|turn on|un[\s-]?86|add back)\b/gi, '')
    .replace(/\b(the|item|please|can you|could you)\b/gi, '')
    .trim();
  return cleanItemName(item);
}

function detectPriceIntent(cmd: string): boolean {
  return /\b(change|set|update|make)\b.*\b(price|cost)\b/i.test(cmd) ||
         /\bprice\b.*\bto\b/i.test(cmd) ||
         /\$\d+/i.test(cmd);
}

function extractPriceInfo(cmd: string): { itemName: string; price: string } {
  const toMatch = cmd.match(/\bto\s+\$?\s*(\d+(?:\.\d{1,2})?)/i);
  const forMatch = cmd.match(/\bfor\s+\$?\s*(\d+(?:\.\d{1,2})?)/i);
  const dollarMatch = cmd.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  const dollarWordMatch = cmd.match(/(\d+(?:\.\d{1,2})?)\s*dollars?/i);
  
  const price = toMatch ? toMatch[1] : 
                forMatch ? forMatch[1] : 
                dollarMatch ? dollarMatch[1] : 
                dollarWordMatch ? dollarWordMatch[1] : '0';
  
  let itemName = cmd
    .replace(/\b(change|set|update|make)\b/gi, '')
    .replace(/\b(price|cost)\b/gi, '')
    .replace(/\bto\s+\$?\s*\d+(?:\.\d{1,2})?\s*(?:dollars?)?/gi, '')
    .replace(/\bfor\s+\$?\s*\d+(?:\.\d{1,2})?\s*(?:dollars?)?/gi, '')
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, '')
    .replace(/\d+(?:\.\d{1,2})?\s*dollars?/gi, '')
    .replace(/\b(the|of|please|can you|could you)\b/gi, '')
    .trim();
  
  return { itemName: cleanItemName(itemName), price };
}

function cleanItemName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .replace(/roll$/i, ' Roll')
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function findBestMatch(searchName: string, items: { id: number; name: string }[]): { item: { id: number; name: string } | null; confidence: number } {
  if (!searchName || items.length === 0) {
    return { item: null, confidence: 0 };
  }
  
  const itemNames = items.map(i => i.name.toLowerCase());
  const search = searchName.toLowerCase();
  
  const result = stringSimilarity.findBestMatch(search, itemNames);
  const bestMatch = result.bestMatch;
  
  if (bestMatch.rating >= 0.4) {
    const matchedItem = items[result.bestMatchIndex];
    return { item: matchedItem, confidence: bestMatch.rating };
  }
  
  return { item: null, confidence: bestMatch.rating };
}
