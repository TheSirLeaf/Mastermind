# Deploy no Cloudflare Pages (com CI/CD)

O Mastermind é um site estático (Vite). O `npm run build` gera a pasta `dist/`, e o Cloudflare Pages
serve esses arquivos de graça. Não há servidor: os rascunhos ficam no navegador de cada pessoa.

## Opção A — integração Git do Cloudflare (a mais simples)

O Cloudflare observa o repositório do GitHub e publica sozinho a cada push.

1. Entre em <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autorize o GitHub e escolha o repositório `TheSirLeaf/Mastermind`.
3. Configure o build:
   - **Production branch:** `main`
   - **Framework preset:** Vite (ou _None_)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION` = `22`
4. **Save and Deploy.** Ao terminar você ganha um endereço `https://mastermind.pages.dev` (o nome é o do projeto).

A partir daí:

- push na `main` → deploy de **produção**
- push em qualquer outra branch ou PR → deploy de **preview** com endereço próprio (o Cloudflare comenta no PR)
- **Rollback:** no painel do projeto, aba _Deployments_, escolha um deploy antigo e **Rollback**

Domínio próprio: projeto → **Custom domains** → **Set up a custom domain** e siga o passo a passo.

## Opção B — GitHub Actions (só publica se o CI passar)

Na opção A o Cloudflare publica mesmo que os testes falhem. Se você quer que o deploy só aconteça depois
do `ci.yml` (formatação, lint, typecheck, testes, build), use o GitHub Actions no lugar da integração Git.

1. No Cloudflare, crie o projeto vazio: **Workers & Pages → Create → Pages → Upload assets**, nome `mastermind`
   (não precisa subir nada).
2. Crie um **API Token**: _My Profile → API Tokens → Create Token → Edit Cloudflare Workers_ (ou um token
   personalizado com **Account → Cloudflare Pages → Edit**). Copie o valor.
3. Copie o **Account ID** (painel do Cloudflare, barra lateral direita da página inicial da conta).
4. No GitHub: repositório → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=mastermind --branch=main
```

6. Para o deploy depender também do E2E do `ci.yml`, troque o gatilho por `workflow_run` do workflow `CI`
   (com `conclusion == 'success'`) ou junte este job ao `ci.yml` com `needs: [quality, e2e]`.

Com a opção B, **desative** a integração Git do projeto (ou crie o projeto como _Upload assets_, como no passo 1)
para não publicar duas vezes.

## Fluxo recomendado

1. Trabalhe em uma branch e abra um PR → o `ci.yml` roda e (opção A) o Cloudflare gera um preview.
2. Revise no preview e faça o merge na `main`.
3. O deploy de produção acontece sozinho.

## Versão

A versão mostrada ao lado de "Rascunho salvo" vem do campo `version` do `package.json`. Para lançar uma
versão nova: `npm version minor` (ou `patch`/`major`), faça o push e o deploy publica já com ela.

## Cuidados

- O app carrega `presentation-template.html` da raiz do site (pasta `public/`), então o site precisa ficar
  na raiz do domínio, sem subpasta.
- Não coloque segredos no código: tudo no build do Vite vai para o navegador.
