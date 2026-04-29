import type React from 'react';
import CloudQueueOutlinedIcon from '@mui/icons-material/CloudQueueOutlined';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function WebdavIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="WebDAV storage"
      description="Use a Nextcloud or WebDAV-compatible directory for statement and receipt file exchange."
      statusPath="/integrations/webdav/status"
      settingsPath="/integrations/webdav/settings"
      disconnectPath="/integrations/webdav"
      icon={<CloudQueueOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      filesPath="/integrations/webdav/files"
      importPath="/integrations/webdav/import"
      syncPath="/integrations/webdav/sync"
      fields={[
        { name: 'url', label: 'WebDAV URL', placeholder: 'https://cloud.example.com/remote.php/dav/files/user', required: true },
        { name: 'rootPath', label: 'Root path', placeholder: '/' },
        { name: 'username', label: 'Username' },
        { name: 'password', label: 'Password', type: 'password' },
      ]}
      workflow="Fill in the WebDAV connection fields and connect. Lumio validates the directory before enabling browse, import, and sync."
    />
  );
}
