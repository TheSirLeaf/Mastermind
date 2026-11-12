# Criando pacotes para o Mastermind

Um **pacote** é um bloco que você insere nos slides (gráfico, caixa de código, tela simulada…).
Qualquer pessoa pode criar um sem mexer no código do editor: basta um arquivo
`.dialcron-pkg.json`, que se instala em **☰ → Arquivo → Gerenciador de pacotes → Importar**.

O exemplo completo e funcional está em
[`docs/examples/callout.dialcron-pkg.json`](./examples/callout.dialcron-pkg.json). O jeito mais
rápido de começar é importá-lo, abrir o arquivo e ir mudando.

## O que um pacote tem

| Campo                   | Obrigatório | Para quê                                                                              |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------- |
| `id`                    | sim         | Identificador único: minúsculas, números e hífens (2–32 caracteres), ex. `meu-pacote` |
| `name`                  | sim         | Nome mostrado no editor                                                               |
| `version`               | sim         | Versão do pacote (ex. `1.0.0`)                                                        |
| `defaults`              | sim         | Valores iniciais do pacote (o chamado `spec`)                                         |
| `form`                  | sim         | Campos do inspetor que editam o `spec`                                                |
| `render`                | sim         | Função que transforma o `spec` em HTML                                                |
| `icon`                  | não         | Nome de ícone (Lucide)                                                                |
| `author`, `description` | não         | Aparecem no gerenciador                                                               |
| `category`              | não         | Agrupa no gerenciador (ex. `Texto`, `Dados`, `Código`). Sem ela vai para "Outros"     |
| `presets`               | não         | Modelos prontos (`name`, `desc`, `spec` parcial)                                      |
| `box`                   | não         | Tamanho inicial ao inserir (`w`, `h`, em px do slide de 1920×1080)                    |
| `css`                   | não         | Estilos do pacote                                                                     |
| `runtime`               | não         | Animação que roda na apresentação                                                     |
| `duration`              | não         | Duração da animação em ms (para a linha do tempo)                                     |
| `transitions`           | não         | Transições de slide próprias (aparecem em Slides → Transição → Pacote)                |

## O arquivo

```json
{
  "format": "dialcron-package",
  "spec": 1,
  "packages": [{ "id": "meu-pacote", "...": "..." }]
}
```

Funções (`render`, `runtime`, `duration`) vão como texto, dentro de `{ "$fn": "function (...) {...}" }`.
Um mesmo arquivo pode ter vários pacotes.

### `defaults` e `form`

O `spec` é um objeto simples. O `form` é uma lista de grupos, cada um com campos ligados às chaves do `spec`:

```json
"form": [
  { "group": "Conteúdo", "open": true, "fields": [
    { "k": "title", "type": "text", "label": "Título" },
    { "k": "text",  "type": "textarea", "label": "Texto", "rows": 4 }
  ]}
]
```

Tipos de campo: `text`, `textarea`, `code`, `number`, `range`, `color`, `select`, `toggle`, `seg`,
`check`, `list`, `row`, `info`, `buttons`. Opções úteis:

- `select`/`seg`: `options: [["valor", "Rótulo"], …]`
- `number`/`range`: `min`, `max`, `step`, `unit`
- `list`: `item` (campos de cada item) e `itemDefault` (valor de um item novo), para listas editáveis
- `row`: `fields` lado a lado
- Qualquer campo ou grupo: `showIf: { "k": "tone", "eq": "red" }` (também `ne` e `in`) mostra só quando a condição vale
- Grupo com `"workspace": "animation"` aparece na aba **Animação** em vez de **Estilo**

### `render(spec, h)`

Devolve uma **string HTML**. Use sempre `h.esc()` em texto que vem do usuário.
Utilitários em `h`:

- `h.esc(texto)` escapa HTML
- `h.num("1,5")` lê número (aceita vírgula)
- `h.fmt(1234.5, 1)` formata em pt-BR (`1.234,5`)
- `h.range("2, 4-6")` vira `{2:true, 4:true, 5:true, 6:true}`
- `h.hl(código, linguagem)` realce de sintaxe por linha

### `css`

CSS comum. Use um prefixo no nome das classes (`.meu-pacote-…`) para não colidir com outros pacotes.
O fundo do slide pode ser claro ou escuro (a base decide), então prefira cores vindas do `spec`.

### `runtime(root, spec, api)` — animação

Roda na apresentação. `root` é o elemento do pacote e `spec` os valores. Devolva `null` (sem animação)
ou `{ play, final }`:

- `play()` inicia a animação quando o slide entra
- `final()` **precisa** deixar o HTML no estado final (é chamado ao sair do slide e ao imprimir/exportar PDF)

`api` oferece:

- `api.reduced`: `true` se a pessoa pediu menos movimento (nesse caso pule a animação)
- `api.alive()`: `false` quando o slide saiu de cena
- `api.wait(ms)`: espera que para sozinha se o slide sair
- `api.frame(fn)`: loop por quadro; `fn` devolve `false` para parar

> **Importante:** a função é copiada como texto para a apresentação exportada. Ela **não pode usar nada de fora**
> (nem imports, nem outras funções do arquivo). Tudo que ela precisa deve estar dentro dela.

### `transitions` — transições de slide

Cada transição tem `id`, `name`, `description` e um `css` com as classes:

- `.t-in`: slide que entra · `.t-out`: slide que sai
- `.t-in-r` e `.t-out-r`: versões ao voltar (opcional)

A duração é a da própria `animation`. O Mastermind renomeia as classes para ficarem únicas por pacote,
então use sempre esses nomes. Para usar: em **Slides**, escolha o slide, **Transição → Pacote** e a transição.

## Instalar e testar

1. **Gerenciador de pacotes → Importar** e escolha o arquivo (ou cole o JSON).
2. Se algo estiver errado, o editor avisa o motivo (id inválido, falta `render`, JSON quebrado…).
3. Insira o pacote em um slide, mude os campos do inspetor e use **Visualizar** (menu ☰) para ver a animação.
4. Para compartilhar: **Exportar** gera o `.dialcron-pkg.json` de volta.

Um pacote importado fica salvo neste navegador. Pacotes só rodam código de quem os criou,
então importe apenas arquivos de fontes em que você confia.

## Pacotes embutidos (para o time do projeto)

Os pacotes que vêm no app (`src/packages/code`, `chart`, `sim`) são escritos em TypeScript/React com a
mesma estrutura (`PackageDef`, em `src/packages/core/types.ts`) e registrados em `src/packages/index.ts`.
Mudanças em `types.ts` são contrato compartilhado: veja o `AGENTS_CONTRACT.md`.
