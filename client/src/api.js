const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  bins: {
    list: () => req('GET', '/bins'),
    create: (data) => req('POST', '/bins', data),
    update: (id, data) => req('PATCH', `/bins/${id}`, data),
    archive: (id) => req('DELETE', `/bins/${id}`),
    history: (id) => req('GET', `/bins/${id}/history`),
  },
  stages: {
    list: () => req('GET', '/stages'),
    create: (data) => req('POST', '/stages', data),
    update: (id, data) => req('PATCH', `/stages/${id}`, data),
    delete: (id) => req('DELETE', `/stages/${id}`),
  },
  units: {
    list: () => req('GET', '/units'),
    create: (data) => req('POST', '/units', data),
    update: (id, data) => req('PATCH', `/units/${id}`, data),
    delete: (id) => req('DELETE', `/units/${id}`),
  },
  admin: {
    archiveAll: () => req('POST', '/admin/archive-all'),
    clearData: () => req('POST', '/admin/clear-data'),
    factoryReset: () => req('POST', '/admin/factory-reset'),
  },
};
