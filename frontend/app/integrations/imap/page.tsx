import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import type React from 'react';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function ImapIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="IMAP inbox"
      description="Poll a generic IMAP mailbox for receipts, invoices, and attachments instead of depending on Gmail APIs."
      statusPath="/integrations/imap/status"
      settingsPath="/integrations/imap/settings"
      disconnectPath="/integrations/imap"
      icon={<MarkEmailUnreadOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      syncPath="/integrations/imap/sync"
      fields={[
        { name: 'host', label: 'Host', placeholder: 'imap.example.com', required: true },
        { name: 'port', label: 'Port', type: 'number', placeholder: '993' },
        {
          name: 'mailbox',
          label: 'Mailbox',
          placeholder: 'INBOX',
          browseAction: {
            label: 'Browse folders',
            endpoint: '/integrations/imap/folders',
            dependsOn: ['host', 'port', 'secure', 'user', 'pass'],
          },
        },
        { name: 'user', label: 'Username', required: true },
        { name: 'pass', label: 'Password', type: 'password', required: true },
        { name: 'secure', label: 'Use TLS', type: 'checkbox' },
      ]}
      workflow="Fill in mailbox credentials and connect. Lumio validates IMAP access before polling unseen mail and importing receipt attachments."
    />
  );
}
