// Twilio SMS wrapper.
// If env vars not configured, returns mock response so the app still runs.

let twilioClient: any = null;

function getClient() {
  if (twilioClient) return twilioClient;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilioClient;
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; mock?: boolean; error?: string }> {
  const client = getClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!client || !fromNumber) {
    console.log(`[SMS-MOCK] To ${to}: ${body}`);
    return { success: true, mock: true };
  }

  try {
    const message = await client.messages.create({ from: fromNumber, to, body });
    return { success: true, sid: message.sid };
  } catch (e: any) {
    console.error('SMS failed:', e.message);
    return { success: false, error: e.message };
  }
}

export function buildJobOfferSMS(args: {
  crewLeaderName: string;
  builderName: string;
  trade: string;
  headcount: number;
  startDate: string;
  endDate: string;
  rate: number | null;
  city: string;
  magicLinkToken: string;
}): string {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/m/${args.magicLinkToken}`;
  const dates = args.startDate === args.endDate ? args.startDate : `${args.startDate} to ${args.endDate}`;
  const rate = args.rate ? `$${args.rate}/hr` : 'rate TBC';
  return `G'day ${args.crewLeaderName} — ${args.builderName} needs ${args.headcount} ${args.trade} ${dates}, ${rate}, ${args.city}.\n\nTap to view + accept: ${url}`;
}
