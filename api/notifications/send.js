import supabaseAdmin from '../lib/supabase.js';
import { authenticate, requireAgency } from '../lib/auth.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await authenticate(req, res);
  if (!user) return;

  if (!requireAgency(user, res)) return;

  const { type, client_id, message } = req.body;

  if (!type || !client_id) {
    return res.status(400).json({ error: 'type and client_id are required' });
  }

  const validTypes = ['report_published', 'content_uploaded', 'feedback_received'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Fetch client details for the email
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('business_name, contact_name, contact_email')
    .eq('id', client_id)
    .single();

  if (clientError || !client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  if (!client.contact_email) {
    return res.status(400).json({ error: 'Client has no contact email' });
  }

  const { subject, body } = buildEmail(type, client, message);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LRD Media <notifications@lrdmedia.com>',
        to: [client.contact_email],
        subject,
        html: body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.message || 'Failed to send email' });
    }

    return res.status(200).json({ success: true, email_id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}

function buildEmail(type, client, customMessage) {
  const name = client.contact_name || client.business_name;

  const templates = {
    report_published: {
      subject: 'Your Monthly Report is Ready - LRD Media',
      heading: 'Your Monthly Report is Ready',
      body: `Your latest monthly performance report has been published and is ready for review.`,
      cta: { text: 'View Report', url: `${APP_URL}/reports` },
    },
    content_uploaded: {
      subject: 'New Content Ready for Review - LRD Media',
      heading: 'New Content Awaiting Your Approval',
      body: `We've uploaded new content for your review. Please take a look and let us know your feedback.`,
      cta: { text: 'Review Content', url: `${APP_URL}/content` },
    },
    feedback_received: {
      subject: 'Feedback Received - LRD Media',
      heading: 'Client Feedback Received',
      body: `New feedback has been submitted on content.`,
      cta: { text: 'View Feedback', url: `${APP_URL}/content` },
    },
  };

  const template = templates[type];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#18181b;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">LRD Media</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#18181b;font-size:22px;">${template.heading}</h2>
              <p style="margin:0 0 8px;color:#3f3f46;font-size:15px;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 24px;color:#3f3f46;font-size:15px;line-height:1.6;">${customMessage || template.body}</p>
              <a href="${template.cta.url}" style="display:inline-block;background-color:#18181b;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">${template.cta.text}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;">LRD Media &mdash; Social Media Management</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { subject: template.subject, body: html };
}
