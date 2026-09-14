# Handoff — CRM Leadrix integrado ao Sistema Operacional Consulcard

> **Para quem está lendo:** você (ou o Claude que você está usando) vai construir um CRM
> do zero. Este documento é o briefing técnico completo. Leia até o fim **antes** de
> escrever código — a seção 7 lista armadilhas que já custaram horas no sistema
> existente e que você vai reencontrar.
>
> **Documento gerado em:** 14/09/2026
> **Origem:** repositório `consulcard-app` (sistema operacional já em produção)

---

## ⚠️ Confirme isto antes de começar

Este documento assume que:

1. **A Leadrix implementa e opera o CRM.** O CRM cobre o funil comercial (captação →
   proposta → fechamento) e, ao fechar contrato, empurra o projeto para o sistema
   operacional da Consulcard.
2. **É um projeto novo, repositório separado.** Não é um módulo dentro do
   `consulcard-app`.
3. **Supabase novo, projeto separado.** O CRM não compartilha banco com o operacional —
   fala com ele por HTTP.

Se alguma dessas premissas estiver errada, pare e alinhe com o Marcelo antes de
codar — as três mudam a arquitetura.

---

## 1. O que existe hoje (e por que o CRM importa)

A Consulcard é uma consultoria de projetos regulatórios e de meios de pagamento. Já
existe em produção um **sistema operacional** que conduz o projeto *depois* de vendido:
atividades em Kanban, co-piloto de IA por projeto, pendências, portal do cliente e
painel executivo.

O que **não** existe é o lado comercial. Hoje o projeto nasce no operacional por
cadastro manual. O CRM fecha esse buraco:

```
┌──────────────────── CRM (você vai construir) ────────────────────┐
│  Lead → Qualificado → Proposta → Negociação → FECHADO            │
└────────────────────────────────┬─────────────────────────────────┘
                                 │  handoff automático (HTTP POST)
                                 ▼
┌──────────── Sistema Operacional Consulcard (já existe) ──────────┐
│  Projeto criado em 'planning' → kickoff → execução → entrega     │
└──────────────────────────────────────────────────────────────────┘
```

**A regra de negócio central:** quando um deal entra no estágio *Fechado*, o CRM
dispara o handoff. O operacional cria o projeto, instancia as atividades-template do
tipo de projeto e devolve a URL do projeto criado.

### Sistema operacional — dados de acesso

| Item | Valor |
|---|---|
| App em produção | `https://consulcard-app.vercel.app` |
| Repositório | `github.com/mypublidigital/consulcard-app` |
| Supabase (project ref) | `djdooeszhpftbiyzznli` |
| Stack | React + Vite + Tailwind + Zustand · Supabase (Postgres + Auth + Edge Functions) · Vercel |
| IA | Anthropic Claude via Edge Function (`chat`) |

---

## 2. Os arquivos desta pasta e como usar cada um

Esta pasta tem três arquivos. **A ordem de leitura importa.**

### `README.md` — este arquivo
Leia inteiro primeiro. É o briefing e o passo a passo.

### `taxonomia-projetos.json` — **o contrato mais importante**
Contém as **6 macro-categorias e 21 tipos de projeto** da Consulcard, com os IDs
exatos, extraídos do código-fonte em produção.

**Como usar:** copie este arquivo para dentro do repositório do CRM (ex:
`src/data/taxonomia-projetos.json`) e alimente com ele os *selects* de classificação
de projeto. **Não redigite os IDs à mão** — um typo em `macro_category` faz o handoff
ser rejeitado em runtime, e você só descobre no fechamento do primeiro contrato.

```jsonc
// estrutura
{
  "portes": [ { "id": "P1", "label": "Pequeno", "duracao": "ate 4 semanas" }, ... ],
  "macroCategorias": [
    {
      "id": "meios-pagamento",           // <- é ISTO que vai no payload
      "label": "Meios de Pagamento",     // <- isto é só para exibir na tela
      "tipos": [
        { "id": "emissor-cartao", "label": "Estruturação de Emissor de Cartão",
          "complexidadeTipica": "4-5", "produtoAncora": true }
      ]
    }
  ]
}
```

> **Atenção à sincronia:** a fonte de verdade original é a planilha
> `2026-08-07_Planilha_ModeloProjetosConsulcard_BibliotecaPrompts_V03.xlsx`, aba
> **"01 · Tipos de Projeto"**. O JSON desta pasta é um espelho do código, que por sua
> vez espelha a planilha. Se a Consulcard publicar uma V04 com tipos novos, os três
> precisam ser atualizados. Considere expor um endpoint no operacional para o CRM
> buscar a taxonomia em runtime em vez de manter cópia — está na seção 8 como melhoria.

### `exemplo-payload-handoff.json`
O contrato de integração completo: payload de ida, respostas de sucesso, de
idempotência e de erro, e a lista de campos obrigatórios.

**Como usar:** é a sua especificação de teste. Monte o payload do CRM até que ele
bata campo a campo com este arquivo, e use as respostas documentadas para escrever os
testes do cliente HTTP.

---

## 3. Modelo de dados sugerido para o CRM

O CRM é a fonte de verdade do **cliente** e do **deal**. O operacional guarda apenas
`client` (razão social) e `client_initials` — ou seja, quase nada. Toda a inteligência
comercial fica com você.

### `companies`
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid | |
| legal_name | text | razão social — é o que vai no handoff |
| trade_name | text | nome fantasia |
| cnpj | text | único |
| segment | enum | ver abaixo |
| size | enum | ver abaixo |
| website, notes | text | |

**`segment`** (proposto, alinhe com o time comercial):
`fintech` · `banco` · `cooperativa` · `instituicao-pagamento` · `sociedade-credito` · `nao-financeiro`

**`size`** (porte do cliente, não confundir com porte do projeto P1-P5):
`seed` (pré-operacional) · `pme` (<500 contas) · `mid-market` (500-50k) · `enterprise` (50k+)

### `contacts`
`id` · `company_id` · `name` · `role` · `email` · `phone` · `is_primary`

### `deals` — a entidade central
| Campo | Tipo | Nota |
|---|---|---|
| id | uuid | |
| company_id | uuid | FK |
| title | text | |
| stage | enum | `lead` → `qualificado` → `proposta` → `negociacao` → `fechado` / `perdido` |
| macro_category | text | **id da taxonomia** |
| project_type | text | **id da taxonomia** |
| size | text | P1-P5 |
| complexity | int | 1-5 |
| contract_value_brl | numeric | |
| billing_model | enum | `milestone` · `mensal` · `fixo` |
| expected_start_date | date | vira `start_date` no operacional |
| expected_end_date | date | vira `target_end_date` |
| consulcard_manager_email | text | **precisa existir em `profiles` do operacional** |
| owner_id | uuid | vendedor responsável |
| handoff_status | enum | `pendente` · `enviado` · `erro` |
| handoff_project_id | text | preenchido com a resposta do operacional |
| handoff_error | text | |
| lost_reason | text | |

### `activities` (do CRM, não confundir com as do operacional)
Ligações, reuniões, e-mails, follow-ups: `id` · `deal_id` · `type` · `due_date` ·
`done_at` · `notes`.

---

## 4. O contrato de integração

### 4.1 Endpoint (a ser criado no operacional)

```
POST https://djdooeszhpftbiyzznli.supabase.co/functions/v1/crm-onboarding
```

> **Esta Edge Function ainda NÃO existe.** Alguém precisa criá-la no repositório
> `consulcard-app`. Ver seção 6, Fase 4 — e combine quem faz: você ou o time do
> operacional. Não assuma que está pronta.

Ela deve: autenticar o chamador → validar o payload contra a taxonomia → resolver
`manager_id` pelo e-mail → inserir em `projects` → instanciar as atividades-template
do `project_type` → devolver `project_id` e URL.

### 4.2 Payload e respostas
Ver `exemplo-payload-handoff.json`. Resumo:

- **201** → projeto criado, devolve `project_id` + `project_url`
- **200** → `external_id` repetido, devolve o projeto já existente (idempotência)
- **4xx** → validação falhou (taxonomia inválida, gerente inexistente)
- **5xx** → erro interno, **o CRM deve fazer retry**

### 4.3 Autenticação — HMAC, não API key

Use **HMAC-SHA256** sobre o corpo bruto:

```
X-Consulcard-Signature: sha256=<hex>
X-Consulcard-Timestamp: <unix>
```

- O segredo (`CRM_WEBHOOK_SECRET`) fica em **Edge Function Secret** no Supabase do
  operacional e em variável de ambiente no CRM. Nunca no código.
- O operacional rejeita se o timestamp tiver mais de **5 minutos** de desvio (anti-replay).
- Calcule o HMAC sobre o **corpo exatamente como enviado** — se você serializar o JSON
  duas vezes com ordens de chave diferentes, a assinatura não bate.

### 4.4 Idempotência e retry — não pule isto

`external_id` é a chave. Sem idempotência, um retry após timeout cria **projeto
duplicado** no operacional, e alguém descobre isso em produção.

- Retry com backoff exponencial: **1s → 5s → 30s → 5min**, só em 5xx e timeout.
- Nunca faça retry em 4xx: o payload está errado, repetir não resolve.
- Grave `handoff_status` no deal e ofereça **reenvio manual** na UI para o caso de
  esgotar os retries.

### 4.5 Webhook de volta (opcional, recomendado)

O operacional notifica o CRM quando o projeto muda de status:

```
POST {CRM_WEBHOOK_URL}/projects/status
{ "project_id": "...", "external_id": "...", "status": "in_progress", "timestamp": "..." }
```

Serve para o CRM mostrar saúde do cliente pós-venda sem ninguém consultar o operacional
na mão.

---

## 5. Porte e complexidade — como o CRM deve preencher

O vendedor não deve digitar `complexity` no chute. A taxonomia já traz
`complexidadeTipica` por tipo de projeto (ex: `emissor-cartao` = `"4-5"`).

**Sugestão de UX:** ao escolher o tipo de projeto, pré-preencha a complexidade com o
piso da faixa e deixe o vendedor ajustar dentro dela. Bloqueie valores fora da faixa
declarada, ou peça justificativa.

| Porte | Duração |
|---|---|
| P1 | até 4 semanas |
| P2 | até 8 semanas |
| P3 | até 16 semanas |
| P4 | até 30 semanas |
| P5 | 30+ semanas |

Complexidade 1-2 = diagnósticos e consultivos curtos · 3 = adequações regulatórias ·
4-5 = projetos âncora (emissor de cartão, BaaS, setup contábil completo).

---

## 6. Passo a passo de implementação

### Fase 1 — Fundação
1. Criar repositório e projeto Supabase novos.
2. Stack sugerida: **mesma do operacional** (React + Vite + Tailwind + Zustand +
   Supabase). Reduz atrito de manutenção entre os dois sistemas.
3. Copiar `taxonomia-projetos.json` para `src/data/`.
4. Modelar as tabelas da seção 3 com **RLS habilitada desde o primeiro dia** (ver
   seção 7 — RLS retroativa é muito mais cara).

### Fase 2 — CRUD e funil
5. Empresas, contatos, deals.
6. Board Kanban por `stage`, com drag-and-drop.
7. Classificação do projeto usando a taxonomia (selects encadeados: macro → tipo).
8. Atividades e follow-ups.

### Fase 3 — Handoff (o coração)
9. Cliente HTTP com HMAC, retry e idempotência (seção 4).
10. Gatilho na transição para `fechado`.
11. **Tela de reenvio manual** para `handoff_status = 'erro'`.
12. Registro de auditoria: quem fechou, quando disparou, o que o operacional respondeu.

### Fase 4 — Lado do operacional
13. Criar a Edge Function `crm-onboarding` no repo `consulcard-app`.
    Use `supabase/functions/admin-users/index.ts` como modelo — ele já tem o padrão de
    CORS, autenticação do chamador, cliente `service_role` e respostas JSON.
14. Validar taxonomia, resolver `manager_id`, inserir projeto, instanciar atividades.
15. Testar ponta a ponta em staging antes de ligar em produção.

### Fase 5 — Operação
16. Dashboard comercial (pipeline, conversão por estágio, ticket médio).
17. Webhook de retorno (4.5).
18. Relatórios.

---

## 7. Armadilhas conhecidas — leia antes de codar

Tudo abaixo foi encontrado **na prática** construindo o sistema operacional. Você vai
reencontrar cada uma.

### 7.1 Supabase mudou o sistema de chaves — as chaves legadas não funcionam
Projetos criados em 2026 usam **`sb_publishable_...`** e **`sb_secret_...`**. As chaves
JWT legadas (`anon` / `service_role`, aquelas que começam com `eyJ...`) aparecem no
painel mas **são rejeitadas pelo gateway** de Edge Functions, com um `401 Invalid
credentials` que não explica nada.

→ Use a **Publishable Key** no cliente. Se der 401 inexplicável, é isso.

### 7.2 `supabase.auth.signUp()` no navegador rouba a sessão do admin
Se o CRM tiver tela de gestão de usuários, **não use `signUp` no cliente**: ele cria o
usuário *e faz login como ele*, derrubando a sessão do admin. O sintoma é bizarro — o
admin "vira" o usuário recém-criado.

→ Crie usuários numa **Edge Function com `service_role`** usando
`auth.admin.createUser()`. Veja `supabase/functions/admin-users/index.ts` no repo do
operacional: está pronto e resolvido.

### 7.3 RLS com subquery na própria tabela = recursão infinita
Uma policy em `profiles` que faz `select ... from profiles` dispara
`42P17 infinite recursion detected in policy`.

→ Use uma função **`SECURITY DEFINER`**. Veja
`supabase/migrations/0002_fix_rls_recursion.sql`.

### 7.4 RLS não protege coluna — só linha
`for select using (true)` deixa **qualquer usuário logado ler todas as colunas**,
inclusive senha temporária, valor de contrato e comissão. A tela esconder não adianta:
basta abrir o DevTools e chamar a API.

→ Use **GRANT por coluna**. E atenção: `REVOKE SELECT (coluna)` **não subtrai** de um
grant de tabela inteira — é preciso revogar a tabela e regrantar coluna a coluna.
Veja `supabase/migrations/0004_password_visibility_hierarchy.sql`.

**No CRM isso é crítico:** `contract_value_brl`, comissão e `lost_reason` não deveriam
ser legíveis por todo vendedor.

### 7.5 `update own` sem `WITH CHECK` = escalonamento de privilégio
Uma policy `for update using (auth.uid() = id)` permite o usuário editar **qualquer
coluna** da própria linha — inclusive `role`. Um vendedor roda
`update profiles set role='admin' where id = auth.uid()` e vira admin.

→ Restrinja por **GRANT UPDATE de coluna**. Mudança de papel só via `service_role`.

### 7.6 O Supabase limita e-mails de autenticação
O SMTP embutido manda pouquíssimos e-mails por hora. Convite, confirmação e "esqueci
minha senha" **quebram em produção** sem SMTP próprio.

→ Configure **Resend** (ou SES) desde o começo. Enquanto não houver, crie usuários com
`email_confirm: true` e entregue a senha por canal fora de banda.

### 7.7 `select("*")` quebra quando há grant por coluna
Depois de restringir colunas, qualquer `select("*")` retorna
`permission denied for column`. Vale também para joins aninhados
(`profiles(*)` no PostgREST).

→ Liste as colunas explicitamente desde o início. Custa nada agora e evita refactor.

---

## 8. Decisões em aberto — alinhe antes de codar

1. **Sincronização da taxonomia.** Cópia do JSON (simples, desincroniza) ou endpoint no
   operacional (correto, exige trabalho dos dois lados)? Recomendo o endpoint quando
   houver a primeira V04.
2. **Identidade do cliente.** O operacional só guarda nome. Vale gravar lá um
   `crm_company_id` para rastrear o cliente entre os dois sistemas?
3. **Cancelamento pós-fechamento.** Se um deal fechado for cancelado, o que acontece com
   o projeto já criado? Sugestão: endpoint `crm-cancel-onboarding` que move para
   `closed` com tag `cancelado`.
4. **Gerente Consulcard.** O CRM precisa listar os gerentes reais. Buscar de
   `profiles` do operacional via endpoint, ou manter lista manual? Hoje o handoff
   resolve por e-mail — funciona, mas erra em silêncio se o e-mail não existir.
5. **Quem constrói a `crm-onboarding`?** Precisa estar decidido antes da Fase 3, senão
   o CRM fica pronto apontando para um endpoint que não existe.

---

## 9. Checklist de validação antes do go-live

- [ ] Handoff cria projeto no operacional e devolve URL válida
- [ ] Mesmo `external_id` reenviado **não** duplica projeto (retorna 200)
- [ ] Timeout no operacional dispara retry e não cria duplicata
- [ ] Payload com `macro_category` inválido é rejeitado com 4xx legível
- [ ] `manager_email` inexistente falha com mensagem clara (não silenciosamente)
- [ ] HMAC inválido é rejeitado com 401
- [ ] Requisição com timestamp velho (>5min) é rejeitada
- [ ] Vendedor comum **não** lê `contract_value_brl` de deals de outros (teste pela API, não pela tela)
- [ ] Vendedor comum **não** consegue alterar o próprio papel
- [ ] `handoff_status = 'erro'` aparece na UI com botão de reenvio
- [ ] Nenhum `select("*")` sobrou em tabela com coluna restrita
- [ ] SMTP próprio configurado (não o embutido do Supabase)

---

## 10. Como pedir ajuda ao Claude com este documento

Se você é o Claude que vai implementar, sugestão de abertura:

> Leia `README.md`, `taxonomia-projetos.json` e `exemplo-payload-handoff.json` desta
> pasta. Confirme as premissas da seção "Confirme isto antes de começar" comigo, depois
> me apresente um plano para a **Fase 1** da seção 6 antes de escrever código.

Vá fase a fase. A seção 7 não é opcional — cada item ali é um bug que já aconteceu.
