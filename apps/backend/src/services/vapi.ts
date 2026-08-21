const VAPI_BASE_URL = 'https://api.vapi.ai';

const getHeaders = () => {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error('VAPI_API_KEY is not configured');
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
};

export const fetchRawAgents = async () => {
  const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch raw agents');
  return await response.json();
};

export const getAgent = async (assistantId: string) => {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${assistantId}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to get agent');
  return await response.json();
};

export const cloneAgent = async (templateVapiId: string, mergedPrompt: string, newName: string) => {
  // 1. Fetch template config
  const templateConfig = await getAgent(templateVapiId);
  
  // 2. Strip out identifying fields from template
  const { 
    id, 
    orgId, 
    createdAt, 
    updatedAt, 
    isServerUrlSecretSet, 
    latestVersion, 
    ...clonableConfig 
  } = templateConfig;

  // 3. Overwrite the prompt (usually found in model.messages for Vapi)
  if (clonableConfig.model && clonableConfig.model.messages) {
    const systemMessageIndex = clonableConfig.model.messages.findIndex(
      (m: any) => m.role === 'system'
    );
    if (systemMessageIndex !== -1) {
      clonableConfig.model.messages[systemMessageIndex].content = mergedPrompt;
    } else {
      clonableConfig.model.messages.push({
        role: 'system',
        content: mergedPrompt,
      });
    }
  } else if (clonableConfig.model) {
    clonableConfig.model.messages = [
      {
        role: 'system',
        content: mergedPrompt,
      }
    ];
  }

  clonableConfig.name = newName;

  // 4. Create new assistant
  const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(clonableConfig),
  });
  if (!response.ok) throw new Error('Failed to create cloned agent');
  return await response.json();
};

export const updateAgentPrompt = async (vapiId: string, mergedPrompt: string) => {
  const currentConfig = await getAgent(vapiId);
  
  let messages = currentConfig.model?.messages || [];
  const systemMessageIndex = messages.findIndex((m: any) => m.role === 'system');
  
  if (systemMessageIndex !== -1) {
    messages[systemMessageIndex].content = mergedPrompt;
  } else {
    messages.push({ role: 'system', content: mergedPrompt });
  }

  const response = await fetch(`${VAPI_BASE_URL}/assistant/${vapiId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      model: {
        ...currentConfig.model,
        messages
      }
    }),
  });
  if (!response.ok) throw new Error('Failed to update agent prompt');
  return await response.json();
};

export const deleteAgent = async (vapiId: string) => {
  const response = await fetch(`${VAPI_BASE_URL}/assistant/${vapiId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete agent');
  return await response.json();
};

export const uploadFileToVapi = async (fileBuffer: Buffer, filename: string, mimeType: string) => {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY is not configured');

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer as any], { type: mimeType }), filename);

  const response = await fetch(`${VAPI_BASE_URL}/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload file to Vapi');
  return await response.json();
};

export const deleteFileFromVapi = async (fileId: string) => {
  const response = await fetch(`${VAPI_BASE_URL}/file/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete file from Vapi');
  return await response.json();
};
