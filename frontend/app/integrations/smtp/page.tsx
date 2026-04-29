import type React from 'react';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function SmtpIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="SMTP email"
      description="Send workspace invitations through any SMTP-compatible mail server."
      statusPath="/settings/email/smtp"
      settingsPath="/settings/email/smtp"
      settingsMethod="put"
      disconnectPath="/settings/email/smtp"
      icon={<AlternateEmailOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      workflow="Enter SMTP connection details and save to verify the transport. Existing passwords stay encrypted when the password field is left blank."
      fields={[
        { name: 'host', label: 'Host', placeholder: 'mail.example.com', required: true },
        { name: 'port', label: 'Port', type: 'number', placeholder: '587', required: true },
        { name: 'secure', label: 'Use TLS', type: 'checkbox' },
        { name: 'user', label: 'Username', placeholder: 'lumio@example.com' },
        { name: 'pass', label: 'Password', type: 'password' },
        {
          name: 'from',
          label: 'From',
          placeholder: 'Lumio <noreply@example.com>',
          required: true,
        },
        { name: 'replyTo', label: 'Reply-To', placeholder: 'support@example.com' },
        { name: 'timeoutMs', label: 'Timeout, ms', type: 'number', placeholder: '10000' },
      ]}
    />
  );
}
