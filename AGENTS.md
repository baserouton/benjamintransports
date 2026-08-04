# Convenções do projeto

- Preferir mudanças pequenas e focadas; não refatorar fora do escopo.
- Manter TypeScript estrito e as fronteiras entre `domain`, `routes`, `server/functions`, `server/repositories` e `server/db`.
- Nunca importar módulos `*.server.ts` em componentes; exponha operações por `createServerFn`.
- Toda operação privada deve validar a sessão no handler do servidor.
- Alterações no schema exigem migration versionada em `drizzle/`.
- Não commitar segredos (`.env`, credenciais). Usar `.env.example` quando variáveis forem introduzidas.
- Commits descritivos (por quê, não só o quê). Evitar reescrever histórico já publicado.
