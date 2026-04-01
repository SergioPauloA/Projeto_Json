# 🏦 Projeto JSON — Gerenciador Automático de Fundos Banestes

Ferramenta de gestão de fundos de investimento do Banestes, desenvolvida em **Google Apps Script (GAS)** para rodar diretamente no **Google Sheets**. Gera automaticamente o JSON atualizado dos fundos, o script SQL para carga no mainframe, e envia ambos por e-mail com layout profissional — **sem nenhuma interação manual necessária**.

---

## ⚡ Como funciona (totalmente automático)

| Quando | O que acontece | Função responsável |
|---|---|---|
| A planilha é aberta | O menu **🏦 Gerenciador Fundos** é criado | `onOpen()` |
| Dados da planilha são alterados (inclui IMPORTRANGE/COAFI) | JSON + SQL gerados e enviados por e-mail automaticamente | `aoAlterarPlanilha()` → `gerarEEnviar()` |
| Toda segunda-feira às 8h | Envio automático semanal garantido | `gerarEEnviar()` via trigger |
| A cada envio | Registro salvo na aba `Log_Envios` | `registrarLog()` |

> **Não são necessários cliques nem botões.** Após configurar o acionador uma única vez, tudo ocorre automaticamente.

---

## 📁 Estrutura de Arquivos

```
Projeto_Json/
├── appsscript.json   # Manifesto do projeto GAS (permissões OAuth e fuso horário)
├── Code.gs           # Todo o backend: leitura das abas, geração JSON/SQL, envio de e-mail,
│                     # triggers automáticos, template de e-mail inline, API do painel de log
├── Sidebar.html      # Painel de log/status (página web simples — sem botões de gestão)
└── README.md         # Esta documentação
```

> O projeto foi reduzido a **apenas 2 arquivos de código** (`Code.gs` + `Sidebar.html`).

---

## 🗂️ Abas da Planilha

| Aba | Função |
|---|---|
| `COAFI` | Importa dados completos do GEART via `=IMPORTRANGE(...)`. É a fonte primária de dados. |
| `PodeSimular` | Lista fundos com datas de início (lookup no COAFI) e calcula se pode simular (≥ 1 ano). |
| `TaxaNova` | Busca a nova taxa de simulação da coluna AR do COAFI (via PROCV). |
| `Inicial` | Visão consolidada: ID, nome, podeSimular atual/novo (F), taxa atual/nova (G). As colunas F e G têm fórmulas que se atualizam automaticamente. |
| `Log_Envios` | Criada automaticamente. Registra todo envio realizado (data, destinatários, fundos, status). |
| `Fundos` *(opcional)* | Aba de fallback com dados estruturados e rentabilidade. Usada quando a aba `Inicial` não existe. |

> O backend lê diretamente os **valores calculados** das fórmulas nas abas `Inicial` (colunas F e G), sem precisar replicar os VLOOKUPs.

---

## 🚀 Guia de Instalação

### 1. Configurar o projeto no Apps Script

1. Acesse [sheets.google.com](https://sheets.google.com) e abra a planilha.
2. Vá em **Extensões → Apps Script**.
3. Renomeie o arquivo padrão para `Code` e cole o conteúdo de `Code.gs`.
4. Crie um arquivo HTML chamado `Sidebar` e cole o conteúdo de `Sidebar.html`.
5. Para o `appsscript.json`: ative em ⚙️ **Configurações do projeto** → "Mostrar arquivo de manifesto" → cole o conteúdo.
6. Salve com **Ctrl+S**.

### 2. Primeira execução e autorização

1. No seletor de funções, escolha `gerarEEnviar` e clique em ▶ **Executar**.
2. Autorize os escopos solicitados (Sheets, Gmail, Triggers).
3. Verifique se o e-mail chegou em `spandrade@banestes.com.br`.

### 3. Ativar os acionadores automáticos (uma única vez)

Use o menu: **🏦 Gerenciador Fundos → ⏰ Configurar Acionadores Automáticos**

Isso configura:
- **onChange**: reage imediatamente a qualquer alteração na planilha (inclusive IMPORTRANGE).
- **Semanal**: toda segunda-feira às 8h (garantia de execução mesmo sem alterações detectadas).

### 4. Testar o envio de e-mail

Execute `testarEnvioEmail()` diretamente no editor do Apps Script para validar o fluxo completo sem depender de triggers.

---

## 🔧 Funções Disponíveis

### Funções que você executa diretamente

| Função | Como usar | O que faz |
|---|---|---|
| `gerarEEnviar` | Menu / Editor GAS | Gera JSON + SQL + envia e-mail + registra log |
| `testarEnvioEmail` | **Editor GAS** | Envia e-mail de TESTE para o desenvolvedor (prefixo `TESTE_`) |
| `configurarAcionador` | Menu / Editor GAS | Ativa acionadores automáticos (onChange + semanal) |
| `removerAcionador` | Menu / Editor GAS | Remove todos os acionadores automáticos |

### Funções internas (chamadas automaticamente)

| Função | O que faz |
|---|---|
| `aoAlterarPlanilha(e)` | Acionador onChange — chama `gerarEEnviar()` com debounce de 30min |
| `obterDadosFundos()` | Lê aba `Inicial` (colunas B, C, F, G) e mescla com dados estáticos de `FUND_DATA` |
| `obterMapaRentabilidade()` | Lê rentabilidade da aba `Fundos` (se existir) |
| `gerarJSON(fundos)` | Monta o JSON com todos os campos + `podeSimular` |
| `gerarSQL(fundos)` | Gera script `UPDATE FNDCDT SET … WHERE FNDCD = …` |
| `buildEmailHTML(...)` | Constrói o HTML do e-mail (template inline, sem arquivo separado) |
| `enviarEmail(...)` | Monta os anexos e envia o e-mail |
| `registrarLog(...)` | Salva resultado na aba `Log_Envios` e no `PropertiesService` |
| `computeHash(str)` | MD5 para detectar mudanças nos dados (evita reenvios idênticos) |

---

## 📄 Leitura das Abas

### Fluxo de dados

```
GEART ──IMPORTRANGE──▶ COAFI ──PROCV──▶ PodeSimular ──PROCV──▶ Inicial (col F)
                                  └────PROCV────▶ TaxaNova   ──SE──▶  Inicial (col G)
                                                                          │
                                                         Code.gs lê aqui ▼
                                                         obterDadosFundos() → JSON + SQL + E-mail
```

### Colunas lidas da aba `Inicial`

| Coluna | Índice | Conteúdo | Uso |
|---|---|---|---|
| B | 1 | ID do fundo (`invest_vipdi`, etc.) | Chave para lookup em `FUND_DATA` |
| C | 2 | Nome completo do fundo | Exibido no e-mail e JSON |
| E | 4 | Taxa Atual (ex.: `35,80%`) | Fallback quando taxa nova está vazia |
| F | 5 | podeSimular Novo (`Sim`/`Não`) — resolvido pelo PROCV | Campo `podeSimular` no JSON |
| G | 6 | Taxa Nova (ex.: `35.80`) — resolvido pelo TEXTO/PROCV | `taxaSimulacao` no JSON; `FNDTXSIMU` no SQL |

---

## 📧 Destinatários de E-mail

| E-mail | Função | Status |
|---|---|---|
| `spandrade@banestes.com.br` | Desenvolvedor | ✅ **Ativo** |
| `iodutra@banestes.com.br` | Igor Dutra | 💤 Comentado — descomentar em `CONFIG.ANALYST_EMAILS` |
| `jcrepossi@banestes.com.br` | Juliana Crepossi | 💤 Comentado — descomentar em `CONFIG.ANALYST_EMAILS` |

---

## 🗄️ Formato do JSON Gerado (v2.0)

```json
{
  "dataAtualizacao": "2026-03-31T08:00:00",
  "versao": "2.0",
  "fonte": "Banestes — Sistema de Gestão de Fundos (GEART via Google Sheets)",
  "totalFundos": 26,
  "fundos": [
    {
      "codigo": 4,
      "nome": "Banestes VIP DI FIC de FIF Renda Fixa Referenciado DI RL",
      "tipo": "Renda Fixa",
      "podeSimular": "Sim",
      "classificacaoRisco": "Baixo",
      "codigoRisco": 1,
      "classificacaoCVM": "Renda Fixa",
      "subClassificacaoCVM": "Referenciado DI",
      "tipoANBIMA": "Renda Fixa Duração Baixa Grau de Investimento",
      "taxaSimulacao": 0.142,
      "cotacaoDiaUtil": "N",
      "rentabilidade": { "diaria": 0.0388, "mensal": 0.1195, "anual": 0.142 }
    }
  ]
}
```

---

## ⚙️ Proteções Automáticas

| Proteção | Descrição |
|---|---|
| **Debounce (30 min)** | `aoAlterarPlanilha` não processa dois eventos em menos de 30 minutos |
| **Hash MD5** | `gerarEEnviar` compara o hash do JSON atual com o último gerado — evita reenvios quando os dados não mudaram |
| **Log de erros** | Qualquer falha é registrada na aba `Log_Envios` com fundo vermelho e status "Erro: …" |

---

## 🔒 Permissões OAuth

| Escopo | Finalidade |
|---|---|
| `spreadsheets` | Ler e escrever nas abas da planilha |
| `gmail.send` | Enviar e-mails com os arquivos anexados |
| `script.triggers` | Criar e gerenciar acionadores automáticos |
| `userinfo.email` | Identificar a conta do usuário |

---

## 👨‍💻 Desenvolvedor

**Sérgio Paulo Andrade** — `spandrade@banestes.com.br`  
Departamento de T.I. — Banestes S.A. — v2.0.0
