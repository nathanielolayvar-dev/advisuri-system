import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface TransporterConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create a reusable transporter object
// Note: For production, use environment variables
// In frontend, prefer calling backend API instead of direct SMTP
let transporter: nodemailer.Transporter | null = null;

export const initializeTransporter = (
  config: TransporterConfig
): nodemailer.Transporter => {
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  return transporter;
};

export const getTransporter = (): nodemailer.Transporter | null => {
  return transporter;
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    if (!transporter) {
      console.error(
        'Email transporter not initialized. Call initializeTransporter first.'
      );
      return false;
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from || '"Advisuri System" <noreply@advisuri.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Helper function to generate HTML email templates
export const createEmailTemplate = (title: string, content: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This is an automated message from Advisuri System SIS.</p>
      </div>
    </body>
    </html>
  `;
};

// Alternative: Send email via backend API (recommended for frontend)
export const sendEmailViaApi = async (
  apiUrl: string,
  options: EmailOptions
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Email sent successfully',
    };
  } catch (error) {
    console.error('Error sending email via API:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};
