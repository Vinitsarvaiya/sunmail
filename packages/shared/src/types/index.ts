// Database & Application Data Types for SunMail

export type DomainStatus = 'pending' | 'verified' | 'disabled';
export type SmtpEncryption = 'None' | 'STARTTLS' | 'TLS';
export type EmailStatus = 'received' | 'processing' | 'forwarded' | 'failed' | 'rejected';
export type DeliveryStatus = 'success' | 'temporary_failure' | 'permanent_failure';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  user_id: string;
  domain: string;
  status: DomainStatus;
  verification_token: string;
  verified_at: string | null;
  mx_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmtpDestination {
  id: string;
  user_id: string;
  name: string;
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  encrypted_password?: string; // Hidden on client
  from_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainRoute {
  id: string;
  domain_id: string;
  smtp_destination_id: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  smtp_destination?: SmtpDestination;
  domain?: Domain;
}

export interface EmailMessage {
  id: string;
  domain_id: string;
  message_id: string | null;
  envelope_from: string;
  envelope_to: string;
  from_address: string;
  to_address: string;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  raw_eml_path: string | null;
  size: number;
  status: EmailStatus;
  received_at: string;
  forwarded_at: string | null;
  error_message: string | null;
  created_at: string;
  attachments?: EmailAttachment[];
  delivery_attempts?: DeliveryAttempt[];
  domain?: Domain;
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size: number;
  storage_path: string;
  created_at: string;
}

export interface DeliveryAttempt {
  id: string;
  email_id: string;
  attempt_number: number;
  smtp_host: string;
  smtp_response_code: number | null;
  smtp_response: string | null;
  status: DeliveryStatus;
  attempted_at: string;
}

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, any>;
  status_code: number | null;
  response: string | null;
  attempt_count: number;
  created_at: string;
}

export interface ParsedEmailData {
  messageId?: string;
  envelopeFrom: string;
  envelopeTo: string;
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  rawMime?: Buffer;
  size: number;
  headers: Record<string, string | string[] | undefined>;
  attachments: {
    filename: string;
    contentType: string;
    content: Buffer;
    size: number;
  }[];
}

export interface WebhookPayload {
  event: 'email.received' | 'email.forwarded' | 'email.failed' | 'email.rejected';
  emailId: string;
  domain: string;
  from: string;
  to: string;
  subject: string | null;
  size: number;
  status: EmailStatus;
  receivedAt: string;
  forwardedAt?: string | null;
  errorMessage?: string | null;
  timestamp: string;
}
