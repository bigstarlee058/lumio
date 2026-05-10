import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import type React from 'react';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function AppUrlIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="Application URL"
      description="Set the public URL used in invitations, shared links, and generated callbacks."
      statusPath="/settings/app"
      settingsPath="/settings/app"
      settingsMethod="put"
      disconnectPath="/settings/app"
      icon={<LinkOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      workflow="Enter the externally reachable frontend URL. The backend normalizes it to an origin and uses it before any server env fallback."
      fields={[
        {
          name: 'publicUrl',
          label: 'Public URL',
          placeholder: 'https://app.example.com',
          required: true,
        },
      ]}
    />
  );
}
