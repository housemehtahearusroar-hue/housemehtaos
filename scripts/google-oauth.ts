/**
 * One-time Google Calendar OAuth setup.
 * Run: npx tsx scripts/google-oauth.ts
 * Copy the refresh token into GOOGLE_CALENDAR_REFRESH_TOKEN.
 */
import { google } from 'googleapis';
import * as readline from 'readline';

const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'http://localhost:3000/api/auth/callback/google'
);

const scopes = ['https://www.googleapis.com/auth/calendar'];

const url = oauth2.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent' });
console.log('Open this URL:\n', url);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste authorization code: ', async (code) => {
  const { tokens } = await oauth2.getToken(code);
  console.log('\nRefresh token (save to GOOGLE_CALENDAR_REFRESH_TOKEN):\n');
  console.log(tokens.refresh_token);
  rl.close();
});
