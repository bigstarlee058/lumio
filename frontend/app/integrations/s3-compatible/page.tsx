import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import type React from 'react';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function S3CompatibleIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="S3-compatible storage"
      description="Use a MinIO or S3-compatible bucket as the storage backend for file import and scheduled sync."
      statusPath="/integrations/s3-compatible/status"
      settingsPath="/integrations/s3-compatible/settings"
      disconnectPath="/integrations/s3-compatible"
      icon={<DnsOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      filesPath="/integrations/s3-compatible/files"
      importPath="/integrations/s3-compatible/import"
      syncPath="/integrations/s3-compatible/sync"
      fields={[
        {
          name: 'endpoint',
          label: 'Endpoint',
          placeholder: 'http://localhost:9000',
          required: true,
        },
        { name: 'region', label: 'Region', placeholder: 'us-east-1' },
        { name: 'bucket', label: 'Bucket', placeholder: 'lumio', required: true },
        { name: 'prefix', label: 'Prefix', placeholder: 'statements' },
        { name: 'accessKeyId', label: 'Access key ID', type: 'password' },
        { name: 'secretAccessKey', label: 'Secret access key', type: 'password' },
        { name: 'forcePathStyle', label: 'Force path-style URLs', type: 'checkbox' },
      ]}
      workflow="Fill in the bucket connection fields and connect. Lumio validates access before enabling browse, import, and sync."
    />
  );
}
