import IntegrationsHub from '@/components/IntegrationsHub';
import { integrationApi } from '@/lib/integrations-api';
import type { Integration, ConnectedIntegration } from '@/lib/integrations-types';

export const dynamic = 'force-dynamic';

async function getData(): Promise<{
  integrations: Integration[];
  connected: ConnectedIntegration[];
}> {
  try {
    const [integrations, connected] = await Promise.all([
      integrationApi.listAll(),
      integrationApi.listConnected().catch(() => [] as ConnectedIntegration[]),
    ]);
    return { integrations, connected };
  } catch {
    return { integrations: [], connected: [] };
  }
}

export default async function IntegrationsPage() {
  const { integrations, connected } = await getData();
  return (
    <IntegrationsHub
      initialIntegrations={integrations}
      initialConnected={connected}
    />
  );
}
