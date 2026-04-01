export interface Client {
  id: string;
  created_at: string;
  name: string;
  nickname?: string;
  phone?: string;
  instagram?: string;
  facebook_id?: string;
  email?: string;
  dob?: string;
  skin_tone?: string;
  allergies?: string;
  tags: string[];
  notes: ClientNote[];
}

export interface ClientNote {
  ts: string;
  text: string;
}

export type BookingType = 'Consultation' | 'New Tattoo' | 'Touch-up' | 'Cover-up';
export type BookingStatus = 'Confirmed' | 'Tentative' | 'Completed' | 'Cancelled' | 'No-show';
export type DepositStatus = 'Paid' | 'Unpaid' | 'Waived';
export type TattooSize = 'S' | 'M' | 'L' | 'XL';
export type ColorMode = 'B&G' | 'Color';

export interface Booking {
  id: string;
  created_at: string;
  client_id: string | null;
  date: string;
  duration: number;
  type: BookingType;
  style?: string;
  placement?: string;
  size?: TattooSize;
  color_mode?: ColorMode;
  deposit?: number;
  deposit_paid?: DepositStatus;
  estimate?: number;
  status: BookingStatus;
  notes?: string;
  quick_booking_raw?: string;
}

export interface Document {
  id: string;
  created_at: string;
  client_id: string;
  booking_id?: string;
  type: 'image' | 'consent_form' | 'id_document' | 'other';
  label?: string;
  storage_path: string;
  is_sensitive: boolean;
  mime_type?: string;
  size_bytes?: number;
  notes?: string;
}

export interface AgeVerificationLog {
  id: string;
  created_at: string;
  client_id: string;
  verified_at: string;
  verified_by: string;
  document_deleted: boolean;
  notes?: string;
}

export type CalendarView = 'month' | 'week' | 'day';
