export interface IntegrationAction {
  name: string;
  label: string;
  description: string;
  params?: ActionParam[];
}

export interface ActionParam {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
}

export interface IntegrationTrigger {
  name: string;
  label: string;
  description: string;
}

export interface Integration {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  auth_type: 'oauth2' | 'api_key' | 'bot_token';
  actions: IntegrationAction[];
  triggers: IntegrationTrigger[];
  flowise_chatflow_id: string;
  webhook_path: string | null;
}

export interface ConnectedIntegration {
  id: string;
  tenant_id: string;
  integration_id: string;
  scopes: string[] | null;
  connected_at: string;
  last_used_at: string | null;
  enabled: boolean;
  token_expires_at: string | null;
}

export interface ConnectResponse {
  auth_url: string | null;
  state: string | null;
  message: string;
}
