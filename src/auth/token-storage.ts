import * as keytar from 'keytar';

const SERVICE_NAME = 'd365-schema-explorer';

export async function saveToken(clientName: string, token: string): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, `${clientName}:token`, token);
}

export async function getToken(clientName: string): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, `${clientName}:token`);
}

export async function deleteToken(clientName: string): Promise<void> {
  await keytar.deletePassword(SERVICE_NAME, `${clientName}:token`);
}
