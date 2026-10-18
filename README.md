# Swiftcar — HTML, CSS, JavaScript e Supabase

Site e painel administrativo sem frameworks, integrados diretamente ao Supabase Auth, PostgreSQL REST e Storage.

## Executar

```powershell
bun run build
```

O conteúdo pronto para publicação na Vercel é gerado em `dist/`.

## Supabase

- Configuração pública: `window.SWIFTCAR_CONFIG` em `index.html`.
- Dados: tabelas `vehicles`, `vehicle_images`, `leads` e `user_roles`.
- Imagens: bucket público `vehicle-images`.
- Autenticação e autorização: Supabase Auth com validação de administrador em `user_roles`.

Use somente a Publishable Key no frontend. Nunca use `service_role` ou outra chave secreta.

## Economia de egress (plano Free)

O plano Free tem 5 GB de egress em cache e 5 GB sem cache por mês, por organização. Quase todo o consumo vem do download de fotos. Por isso:

- Fotos de veículos e de leads são comprimidas no navegador antes do upload (`js/image-optimizer.js`): no máximo 1600 px, em WebP (ou JPEG quando o navegador não gera WebP).
- Cada foto de veículo tem uma miniatura de 480 px. O caminho segue a convenção `<veículo>/<uuid>.opt.<ext>` (foto) e `<veículo>/<uuid>.thumb.<ext>` (miniatura). Cards, home e painel usam a miniatura; a foto completa aparece só na página de detalhes e no zoom.
- Os uploads enviam `Cache-Control: max-age=31536000`. Os caminhos nunca são sobrescritos, então o navegador do visitante reaproveita a imagem sem baixá-la de novo.
- A listagem pública busca só as colunas usadas e fica em memória por 5 minutos durante a navegação. O painel reaproveita os dados já carregados, sem consultas repetidas.

### Fotos enviadas antes da otimização

Fotos antigas continuam funcionando, mas são baixadas no tamanho original. Para convertê-las uma única vez:

```powershell
bunx serve .
```

Abra `http://localhost:3000/tools/otimizar-fotos.html`, entre com uma conta administrativa e siga as instruções. A pasta `tools/` não é copiada para `dist/` e não é publicada.

### Segurança do Storage

`supabase/storage-hardening.sql` limita o tamanho dos arquivos e restringe o upload público de fotos de leads. Ele deve ser revisado e executado manualmente no SQL Editor.

## Primeiro acesso

O usuário deve existir no Supabase Auth e possuir `role = admin` na tabela `user_roles`. O acesso é feito em `/admin/login` com e-mail e senha.

## Arquivos principais

- `js/site.js`: páginas e painel executados no navegador.
- `js/image-optimizer.js`: compressão de fotos e convenção de miniaturas.
- `js/stock-enhancements.js`: melhorias de interação integradas ao Supabase.
- `tools/otimizar-fotos.html`: ferramenta local para converter as fotos antigas.
- `js/local-api.js`: arquivo legado mantido apenas no código-fonte; não é carregado nem publicado pelo build.
- `css/`: folhas de estilo organizadas por seção.
- `scripts/`: scripts de build e verificação.
