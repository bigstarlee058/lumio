import type React from 'react';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { ProtocolIntegrationPage } from '../open-protocol-page';

export default function AiCompatibleIntegrationPage(): React.JSX.Element {
  return (
    <ProtocolIntegrationPage
      title="AI-compatible endpoint"
      description="Use an OpenAI-compatible local or self-hosted backend such as Ollama, LocalAI, or vLLM."
      statusPath="/settings/integrations/ai"
      settingsPath="/settings/integrations/ai"
      settingsMethod="put"
      disconnectPath="/settings/integrations/ai"
      icon={<SmartToyOutlinedIcon sx={{ fontSize: 24 }} aria-hidden="true" />}
      workflow="Fill in the endpoint and model, then save to validate a JSON chat completion request. Secrets are stored encrypted and are never returned to the browser."
      fields={[
        {
          name: 'enabled',
          label: 'Enabled',
          type: 'checkbox',
        },
        {
          name: 'baseUrl',
          label: 'Base URL',
          placeholder: 'http://localhost:11434',
          required: true,
        },
        {
          name: 'model',
          label: 'Model',
          placeholder: 'llama3.1',
          required: true,
        },
        {
          name: 'apiKey',
          label: 'API key',
          type: 'password',
          placeholder: 'Optional for local backends',
        },
        {
          name: 'timeoutMs',
          label: 'Timeout, ms',
          type: 'number',
          placeholder: '20000',
        },
      ]}
    />
  );
}
