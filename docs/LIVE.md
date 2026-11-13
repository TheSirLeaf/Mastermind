# Interação ao vivo (espectadores)

A plateia entra pelo celular com o **código da apresentação** e um **nome** e conversa no chat dos
slides que você marcar. O apresentador ganha uma visão própria e a plateia vê a apresentação limpa
em outra janela.

## Como usar

1. Na aba **Slides**, abra **Preferências** (canto direito da barra inferior) e ligue **Interação ao vivo**.
2. Em cada slide onde a plateia pode conversar, marque **Chat ao vivo** (aba Slides → inspetor).
3. Na aba **Apresentação** (ou F5) abre a **visão do apresentador**: o código da sala (5 caracteres),
   o endereço para participar (`/join/CODIGO`), o slide atual e o próximo, as notas, o cronômetro e o chat.
4. **Abrir tela de exibição** abre uma segunda janela (`/screen/CODIGO`). Arraste para o projetor e dê dois
   cliques para tela cheia. Ela acompanha o slide sozinha e mostra as últimas mensagens nos slides com chat.
5. A plateia abre o endereço (ou digita o código em `/join`), escolhe um nome e conversa. O chat só aceita
   mensagens nos slides marcados; na visão do apresentador você pode abri-lo ou fechá-lo a qualquer momento
   e apagar mensagens.

### Ver o slide no celular

Nas mesmas preferências, **Espectadores veem o slide no celular** faz o celular mostrar o slide que está na
tela do apresentador, com as animações e as transições, só para olhar (sem controle). O app envia uma cópia
comprimida do deck para a sala **sem as notas do apresentador**; a plateia baixa essa cópia e acompanha só o
número do slide. Quem tem o código da sala consegue baixar essa cópia, então use salas só durante a apresentação.

### QR code com o link da sala

O pacote **QR code** (categoria Mídia) gera um QR de um link ou texto, com tamanho, cores, borda e correção de
erros definíveis. Ligando **Sempre mostrar o link da sala**, o QR passa a ser o endereço de participação da
sala (`/join/CODIGO`), qualquer que seja o código, e se atualiza sozinho quando o código muda. No editor ele
aparece esmaecido (exemplo); o QR real aparece na visão do apresentador, na tela exibida e no celular.

### Encerrar

Ao encerrar a apresentação (ou se o apresentador fechar a janela), a sala fecha: o chat e a visão do slide
deixam de funcionar para todos e o celular mostra "Aguardando o apresentador".

Sem a interação ao vivo ligada, a apresentação continua como sempre (tela cheia, sem servidor).

## Como funciona por dentro

- **Servidor:** um Cloudflare Worker (`worker/`) com um **Durable Object por sala** (`worker/room.ts`),
  usando WebSocket com hibernação. O estado da sala (slide atual, chat aberto, últimas 100 mensagens) fica
  no storage do objeto. As rotas `/api/*` passam pelo Worker; o resto do site sai dos arquivos estáticos.
- **Protocolo:** `src/live/protocol.ts` (compartilhado entre o app e o Worker). O apresentador prova que é
  o dono da sala com uma chave aleatória enviada na primeira mensagem; uma segunda conexão de apresentador
  com outra chave é recusada.
- **Limites por segurança:** nome até 24 caracteres, mensagem até 280, uma mensagem a cada 0,8 s por pessoa,
  histórico de 100 mensagens por sala. Texto é sempre mostrado como texto (nunca como HTML).
- **Duas telas:** a visão do apresentador e a tela exibida conversam por `BroadcastChannel` (mesmo
  navegador). Não passa pelo servidor.

## Rodar localmente

```bash
npm run build          # o Worker precisa da pasta dist
npm run dev:worker     # Worker + Durable Object em http://127.0.0.1:8787
npm run dev            # editor em http://127.0.0.1:5173 (o /api é repassado para o Worker)
```

Teste ponta a ponta (sobe o editor e o Worker sozinho): `npm run test:e2e`.

## Deploy

O mesmo `npx wrangler deploy` do [guia de deploy](./DEPLOY.md) publica o site e o Worker juntos; o
`wrangler.jsonc` já declara o Durable Object e a migração. Não há segredo para configurar.

## Limites do plano gratuito do Cloudflare

Uma sala de 30 pessoas cabe com folga. O que conta: pedidos do Worker (as mensagens de entrada do WebSocket
contam 1 pedido a cada 20 mensagens; as de saída não contam), tempo de execução do Durable Object (a
hibernação evita cobrar enquanto ninguém fala) e gravações no storage. Confira os números atuais na
documentação de limites do Cloudflare antes de apresentar para muita gente.

## Próximas etapas

Emojis que voam, perguntas escolhidas pelo apresentador para aparecer no slide e o modo de apresentação
**Áreas**.
