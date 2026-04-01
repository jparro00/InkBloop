import { useClientStore } from '../stores/clientStore';

interface ParsedBooking {
  client_id?: string;
  date?: string;
  duration?: number;
  type?: string;
  style?: string;
  placement?: string;
  color_mode?: string;
  size?: string;
}

const styleKeywords = [
  'traditional', 'neo-traditional', 'japanese', 'realism', 'watercolor',
  'minimalist', 'fine line', 'tribal', 'geometric', 'blackwork',
  'dotwork', 'new school', 'old school', 'chicano', 'biomechanical',
];

const placements = [
  'wrist', 'forearm', 'upper arm', 'shoulder', 'back', 'chest',
  'ribs', 'hip', 'thigh', 'calf', 'ankle', 'foot', 'neck',
  'collarbone', 'bicep', 'tricep', 'shin', 'knee',
];

const sideKeywords = ['left', 'right', 'inner', 'outer', 'upper', 'lower'];

export function parseQuickBooking(text: string): ParsedBooking {
  const result: ParsedBooking = {};
  const lower = text.toLowerCase();

  // Try to match client name
  const clients = useClientStore.getState().clients;
  for (const client of clients) {
    const firstName = client.name.split(' ')[0].toLowerCase();
    const fullName = client.name.toLowerCase();
    if (lower.includes(fullName) || lower.includes(firstName)) {
      result.client_id = client.id;
      break;
    }
  }

  // Color mode
  if (lower.includes('b&g') || lower.includes('black and grey') || lower.includes('black & grey') || lower.includes('black and gray')) {
    result.color_mode = 'B&G';
  } else if (lower.includes('color') || lower.includes('colour') || lower.includes('full color')) {
    result.color_mode = 'Color';
  }

  // Style
  for (const style of styleKeywords) {
    if (lower.includes(style)) {
      result.style = style.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  // Placement (with side)
  for (const placement of placements) {
    const idx = lower.indexOf(placement);
    if (idx !== -1) {
      let fullPlacement = placement;
      // Check for side modifier before placement
      const before = lower.slice(Math.max(0, idx - 10), idx).trim();
      for (const side of sideKeywords) {
        if (before.endsWith(side)) {
          fullPlacement = `${side} ${placement}`;
          break;
        }
      }
      result.placement = fullPlacement.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      break;
    }
  }

  // Duration
  const durationMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (durationMatch) {
    result.duration = parseFloat(durationMatch[1]);
  }

  // Size
  if (/\bxl\b/i.test(lower) || /\bextra\s*large\b/i.test(lower)) {
    result.size = 'XL';
  } else if (/\blarge\b/i.test(lower) || /\bbig\b/i.test(lower)) {
    result.size = 'L';
  } else if (/\bmedium\b/i.test(lower) || /\bmed\b/i.test(lower)) {
    result.size = 'M';
  } else if (/\bsmall\b/i.test(lower) || /\btiny\b/i.test(lower)) {
    result.size = 'S';
  }

  // Type
  if (lower.includes('consultation') || lower.includes('consult')) {
    result.type = 'Consultation';
  } else if (lower.includes('touch-up') || lower.includes('touchup') || lower.includes('touch up')) {
    result.type = 'Touch-up';
  } else if (lower.includes('cover-up') || lower.includes('coverup') || lower.includes('cover up')) {
    result.type = 'Cover-up';
  } else {
    result.type = 'New Tattoo';
  }

  // Date/time — look for common patterns
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const min = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    if (timeMatch[3] === 'pm' && hour < 12) hour += 12;
    if (timeMatch[3] === 'am' && hour === 12) hour = 0;

    // Find a date reference
    const now = new Date();
    let targetDate = new Date(now);

    if (lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('monday')) {
      targetDate = getNextWeekday(now, 1);
    } else if (lower.includes('tuesday')) {
      targetDate = getNextWeekday(now, 2);
    } else if (lower.includes('wednesday')) {
      targetDate = getNextWeekday(now, 3);
    } else if (lower.includes('thursday')) {
      targetDate = getNextWeekday(now, 4);
    } else if (lower.includes('friday')) {
      targetDate = getNextWeekday(now, 5);
    } else if (lower.includes('saturday')) {
      targetDate = getNextWeekday(now, 6);
    } else if (lower.includes('sunday')) {
      targetDate = getNextWeekday(now, 0);
    }

    targetDate.setHours(hour, min, 0, 0);
    result.date = targetDate.toISOString();
  }

  return result;
}

function getNextWeekday(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}
