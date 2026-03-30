# 🏦 Projeto JSON — Gerenciador de Fundos Banestes

Ferramenta de gestão de fundos de investimento do Banestes, desenvolvida em **Google Apps Script (GAS)** para rodar diretamente no **Google Sheets**. Gera automaticamente o JSON atualizado dos fundos com rentabilidade (fonte: **GEART** — sistema interno de dados de fundos do Banestes, acessado como leitura), o script SQL para carga no mainframe, e envia ambos os arquivos por e-mail com layout profissional.

---

## ⚡ O que é AUTOMÁTICO vs o que precisa ser EXECUTADO MANUALMENTE

> **Leia esta seção antes de qualquer coisa.** Ela responde exatamente quais funções você precisa executar no Apps Script.

---

### 🤖 O que roda AUTOMATICAMENTE (sem nenhuma ação sua)

| Quando | O que acontece | Função responsável |
|---|---|---|
| Toda vez que a planilha é aberta | O menu **🏦 Gerenciador Fundos** é criado na barra de menus | `onOpen()` |
| Na primeira abertura (se a aba "Fundos" não existir) | A aba `Fundos` é criada e populada com os dados dos 17 fundos ativos | `criarAbaDadosFundos()` |
| Toda **segunda-feira às 8h** *(após o acionador ser configurado)* | JSON e Script SQL são gerados e enviados por e-mail automaticamente | `gerarEEnviar()` via trigger |
| A cada envio | O registro é salvo na aba `Log_Envios` e os arquivos ficam disponíveis no painel | `registrarLog()` |

> ⚠️ **Atenção:** O envio semanal automático **não funciona sozinho desde o início**. Você precisa ativar o acionador **uma única vez** (veja abaixo).

---

### 🖱️ O que você precisa executar MANUALMENTE (apenas uma vez)

Execute as funções abaixo **uma única vez**, nesta ordem, após importar o projeto:

#### PASSO 1 — Autorizar o projeto (obrigatório na primeira vez)

No editor do Apps Script, selecione a função `gerarEEnviar` no seletor de funções e clique em ▶ **Executar**. O Google vai pedir autorização para:
- Acessar o Google Sheets
- Enviar e-mails pelo Gmail
- Gerenciar acionadores de tempo

Clique em **Autorizar acesso** e conclua o fluxo. Isso só precisa ser feito **uma vez**.

#### PASSO 2 — Testar o envio manual

Após autorizar, volte à planilha e use o menu:  
**🏦 Gerenciador Fundos → 🔄 Gerar e Enviar Agora**

Ou pelo painel lateral:  
**🏦 Gerenciador Fundos → 📊 Abrir Painel de Gestão → botão 🚀 Gerar e Enviar Agora**

Verifique se o e-mail chegou em `spandrade@banestes.com.br`.

#### PASSO 3 — Ativar o envio automático semanal (uma única vez)

Use o menu:  
**🏦 Gerenciador Fundos → ⏰ Configurar Acionador Automático**

Ou pelo painel lateral:  
**botão ⏰ Ativar Envio Automático**

Após isso, **nunca mais precisa fazer nada** — o sistema enviará automaticamente toda segunda-feira às 8h.

---

### 📋 Resumo rápido: quais funções executar no Apps Script

| Função | Como executar | Quando executar |
|---|---|---|
| `gerarEEnviar` | No editor GAS ▶ ou via menu/painel | **1x na primeira vez** (para autorizar e testar) |
| `configurarAcionador` | Via menu ou painel lateral | **1x** para ligar o envio automático semanal |
| `removerAcionador` | Via menu ou painel lateral | Apenas se quiser **desligar** o automático |

**As demais funções (`gerarJSON`, `gerarSQL`, `enviarEmail`, `obterDadosFundos`, etc.) são internas** — elas são chamadas automaticamente por `gerarEEnviar` e **nunca precisam ser executadas diretamente**.

---

## 📌 Funcionalidades Implementadas

| Funcionalidade | Status | Descrição |
|---|---|---|
| **Base de dados de fundos** | ✅ Ativo | Aba `Fundos` no Google Sheets com todos os 17 fundos ativos |
| **Geração de JSON** | ✅ Ativo | JSON completo com dados dos fundos e rentabilidade (GEART) |
| **Geração de Script SQL** | ✅ Ativo | Script `UPDATE FNDCDT` pronto para rodar no mainframe |
| **Envio de e-mail com anexos** | ✅ Ativo | E-mail HTML profissional com JSON e SQL como anexos |
| **E-mail personalizável** | ✅ Ativo | Template com tabela de fundos, badges de risco e rentabilidade |
| **Acionador automático** | ✅ Ativo | Toda segunda-feira às 8h (após configuração única) |
| **Painel de Gestão (Sidebar)** | ✅ Ativo | Status, prévia dos arquivos, lista de fundos, botões de ação |
| **Log de Envios** | ✅ Ativo | Aba `Log_Envios` com histórico completo de todos os envios |
| **Menu no Google Sheets** | ✅ Ativo | Menu `🏦 Gerenciador Fundos` criado automaticamente ao abrir |
| **Persistência de estado** | ✅ Ativo | Último JSON/SQL gerado disponível no painel via PropertiesService |

---

## 📁 Estrutura de Arquivos

```
Projeto_Json/
├── appsscript.json       # Manifesto do projeto GAS (permissões OAuth e fuso horário)
├── Code.gs               # Script principal: toda a lógica de negócio, triggers e API do painel
├── Sidebar.html          # Interface HTML do painel lateral de gestão (dashboard)
├── EmailTemplate.html    # Template HTML do e-mail com tabela de fundos e branding Banestes
└── README.md             # Esta documentação
```

---

## 🚀 Guia de Instalação Completo

### 1. Criar a planilha e importar o projeto

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha.
2. Vá em **Extensões → Apps Script**.
3. No editor do Apps Script:
   - Renomeie o arquivo padrão `Código.gs` para `Code` e cole o conteúdo de `Code.gs`.
   - Crie um novo arquivo HTML chamado `Sidebar` e cole o conteúdo de `Sidebar.html`.
   - Crie um novo arquivo HTML chamado `EmailTemplate` e cole o conteúdo de `EmailTemplate.html`.
4. Para copiar o `appsscript.json`: clique em ⚙️ **Configurações do projeto** → ative **"Mostrar o arquivo de manifesto appsscript.json"** → cole o conteúdo.
5. Salve tudo com **Ctrl+S** (ou Cmd+S no Mac).

### 2. Primeira execução e autorização

1. No seletor de funções, escolha `gerarEEnviar` e clique em ▶ **Executar**.
2. Clique em **Examinar permissões** → escolha sua conta Google → clique em **Avançado** → **Acessar Projeto JSON (não seguro)** → **Permitir**.
3. Aguarde a execução. O e-mail de teste será enviado para `spandrade@banestes.com.br`.

### 3. Ativar o envio automático semanal

1. Volte à planilha (recarregue se necessário).
2. Clique no menu **🏦 Gerenciador Fundos → ⏰ Configurar Acionador Automático**.
3. Confirme com **OK** na mensagem de sucesso.
4. A partir desse momento, todo envio semanal ocorre automaticamente.

### 4. (Opcional) Ativar e-mails para os analistas

Quando estiver satisfeito com os testes, edite `Code.gs` e na função `enviarEmail`, descomente as duas linhas:

```javascript
// 'iodutra@banestes.com.br',    // Igor Dutra
// 'jcrepossi@banestes.com.br',  // Juliana Crepossi (chefe)
```

Remova as `//` do início de cada linha e salve.

---

## 📧 Destinatários de E-mail

| E-mail | Função | Status atual |
|---|---|---|
| `spandrade@banestes.com.br` | Sérgio Paulo — Desenvolvedor (testes) | ✅ **Ativo** |
| `iodutra@banestes.com.br` | Igor Dutra — Analista | 💤 Comentado — descomentar após validação |
| `jcrepossi@banestes.com.br` | Juliana Crepossi — Chefe | 💤 Comentado — descomentar após validação |

---

## 🗄️ Estrutura da Planilha

### Aba `Fundos` — Base de Dados Principal

Criada automaticamente na primeira execução. Contém todos os fundos ativos no App.

| Coluna | Campo no sistema | Descrição |
|---|---|---|
| A | `FNDCD` | Código numérico do fundo |
| B | `NOME` | Nome completo do fundo |
| C | `FNDCTFND` | Tipo do fundo (ex.: Renda Fixa, Ações, Multimercado) |
| D | `FNDCLSRISC` | Classificação de risco: Muito Baixo / Baixo / Médio / Alto |
| E | `FNDCLSCVM` | Classificação CVM |
| F | `FNDSUBCVM` | Sub-classificação CVM |
| G | `FNDTOAMB` | Tipo ANBIMA |
| H | `FNDTXSIMU` | Taxa de simulação (decimal, ex.: 0.1338 = 13,38%) |
| I | `FNDCOTDIAUTIL` | Cotação em dia útil: S (sim) ou N (não) |
| J | `RENT_DIARIA` | Rentabilidade diária — **fonte: GEART** |
| K | `RENT_MENSAL` | Rentabilidade mensal — **fonte: GEART** |
| L | `RENT_ANUAL` | Rentabilidade anual — **fonte: GEART** |

> **Importante:** Para atualizar os dados de rentabilidade com os valores reais da tabela GEART, edite as colunas J, K e L diretamente na planilha antes de executar o envio.

### Aba `Log_Envios` — Histórico de Envios

Criada automaticamente no primeiro envio. Registra cada operação realizada.

| Coluna | Conteúdo |
|---|---|
| Data/Hora | Timestamp do envio (dd/MM/yyyy HH:mm:ss) |
| Destinatários | E-mails que receberam o arquivo naquele envio |
| Qtd. Fundos | Quantidade de fundos incluídos no JSON e SQL |
| Arquivo JSON | Nome do arquivo JSON gerado (com timestamp) |
| Arquivo SQL | Nome do script SQL gerado (com timestamp) |
| Status | Resultado do envio |

---

## 🔧 Referência Completa das Funções

### Funções que você interage diretamente

| Função | Onde chamar | O que faz |
|---|---|---|
| `onOpen()` | **Automática** (ao abrir a planilha) | Cria o menu `🏦 Gerenciador Fundos` na barra de menus |
| `abrirPainel()` | Menu → Abrir Painel de Gestão | Abre o painel lateral de gestão (dashboard) |
| `gerarEEnviar()` | Menu / Painel / Trigger automático | **Função principal:** gera JSON + SQL + envia e-mail + registra log |
| `configurarAcionador()` | Menu / Painel | Agenda envio automático toda segunda-feira às 8h |
| `removerAcionador()` | Menu / Painel | Remove o agendamento automático |

### Funções internas (chamadas automaticamente, nunca execute diretamente)

| Função | O que faz |
|---|---|
| `obterDadosFundos()` | Lê os dados da aba `Fundos`; cria a aba se não existir |
| `criarAbaDadosFundos()` | Cria e formata a aba `Fundos` com os 17 fundos ativos |
| `gerarJSON()` | Monta o JSON com todos os campos dos fundos + rentabilidade |
| `gerarSQL()` | Gera o script SQL com `UPDATE FNDCDT SET ... WHERE FNDCD = ...` para cada fundo |
| `enviarEmail()` | Monta os anexos (JSON + SQL) e envia o e-mail HTML para os destinatários |
| `registrarLog()` | Salva o resultado na aba `Log_Envios` e no `PropertiesService` |
| `obterStatusAtual()` | Retorna dados de status para o painel (última atualização, acionador, total de fundos) |
| `obterUltimoJSON()` | Retorna o último JSON gerado (para prévia no painel) |
| `obterUltimoSQL()` | Retorna o último SQL gerado (para prévia no painel) |
| `obterListaFundosPainel()` | Retorna a lista de fundos formatada para o painel lateral |

---

## 📊 Painel de Gestão (Sidebar)

Acesse pelo menu **🏦 Gerenciador Fundos → 📊 Abrir Painel de Gestão**.

O painel exibe:
- **Total de fundos** cadastrados na aba `Fundos`
- **Status do acionador** (Ativo ✅ ou Inativo ⏸)
- **Última atualização** — data/hora do último envio realizado
- **Último status** — resultado do último envio
- **Destinatários** do último envio
- **Prévia do último JSON gerado** (aba JSON)
- **Prévia do último Script SQL gerado** (aba Script SQL)
- **Lista de todos os fundos** com código, tipo, risco e rentabilidade anual

Botões disponíveis no painel:
- **🚀 Gerar e Enviar Agora** — executa o ciclo completo imediatamente
- **⏰ Ativar Envio Automático** — configura o acionador semanal
- **🗑️ Remover** — desativa o acionador automático
- **🔄 Atualizar Status** — recarrega as informações do painel

---

## 📨 Formato do E-mail Enviado

Cada e-mail contém:
- **Assunto:** `🏦 Banestes — Atualização de Fundos — dd/MM/yyyy HH:mm`
- **Corpo HTML** com:
  - Cabeçalho com identidade visual Banestes
  - Card com total de fundos e nomes dos arquivos
  - Tabela completa de todos os fundos com classificação de risco (badge colorido) e rentabilidade anual
  - Orientações sobre os arquivos anexos
  - Rodapé com contato do desenvolvedor
- **Anexo 1:** `fundos_banestes_YYYYMMDD_HHmmss.json` — JSON completo
- **Anexo 2:** `script_mainframe_YYYYMMDD_HHmmss.sql` — Script SQL para o mainframe

---

## 🗄️ Formato do JSON Gerado

```json
{
  "dataAtualizacao": "2026-03-30T08:00:00",
  "versao": "1.0",
  "fonte": "Banestes — Sistema de Gestão de Fundos (GEART)",
  "totalFundos": 17,
  "fundos": [
    {
      "codigo": 4,
      "nome": "BANESTES VIP DI",
      "tipo": "Renda Fixa",
      "classificacaoRisco": "Baixo",
      "codigoRisco": 1,
      "classificacaoCVM": "Renda Fixa",
      "subClassificacaoCVM": "Referenciado DI",
      "tipoANBIMA": "Renda Fixa Duração Baixa Grau de Investimento",
      "taxaSimulacao": 0.142,
      "cotacaoDiaUtil": "N",
      "rentabilidade": {
        "diaria": 0.0388,
        "mensal": 0.1195,
        "anual": 0.142
      }
    }
  ]
}
```

---

## 🗄️ Formato do Script SQL Gerado

```sql
/*******************************************************************************
Finalidade do script: Carga de dados atualizada conforme planilha (Somente fundos ativos no App)
Regra: FNDCLSRISC (0=Muito Baixo, 1=Baixo, 2=Médio, 3=Alto)
Gerado em: 30/03/2026 08:00
*******************************************************************************/

-- 4; BANESTES VIP DI
UPDATE FNDCDT SET
    FNDCTFND = 'Renda Fixa', FNDCLSRISC = 'Baixo', FNDCLSCVM = 'Renda Fixa', FNDSUBCVM = 'Referenciado DI',
    FNDTOAMB = 'Renda Fixa Duração Baixa Grau de Investimento', FNDTXSIMU = 0.142, FNDCOTDIAUTIL = 'N'
WHERE FNDCD = 4;

COMMIT;
```

---

## ⚙️ Regra de Risco (FNDCLSRISC)

| Classificação | Código numérico |
|---|---|
| Muito Baixo | 0 |
| Baixo | 1 |
| Médio | 2 |
| Alto | 3 |

---

## 💼 Fundos Ativos Cadastrados

| Cód. | Nome | Tipo | Risco |
|---|---|---|---|
| 2 | BANESTES INVEST MONEY | Renda Fixa | Baixo |
| 4 | BANESTES VIP DI | Renda Fixa | Baixo |
| 6 | BANESTES VITORIA 500 | Renda Fixa | Baixo |
| 8 | BANESTES INSTITUCIONAL | Renda Fixa | Médio |
| 15 | BANESTES BTG PACTUAL ABSOLUTO | Ações | Alto |
| 16 | BANESTES VALORES | Renda Fixa | Baixo |
| 18 | BANESTES LIQUIDEZ | Renda Fixa | Baixo |
| 22 | BANESTES INCENTIVADO RF | Renda Fixa (Infra) | Alto |
| 23 | BANESTES ESTRATEGIA | Renda Fixa | Médio |
| 24 | BANESTES DIVIDENDOS | Ações | Alto |
| 28 | BANESTES INVEST FACIL | Renda Fixa Simples | Muito Baixo |
| 31 | BANESTES IMA-B 5 | Renda Fixa | Médio |
| 32 | BANESTES CRED CORP | Renda Fixa | Alto |
| 33 | BANESTES MULTIESTRATEGIA | Multimercado | Alto |
| 34 | BANESTES SELECTION | Renda Fixa | Médio |
| 36 | BANESTES TENAX | Ações | Alto |
| 38 | BANESTES SYNERGY | Ações | Alto |

---

## ❓ Perguntas Frequentes

**Preciso abrir o Apps Script toda vez para o envio funcionar?**  
Não. Depois de configurar o acionador (`configurarAcionador`), o Google executa automaticamente toda segunda-feira às 8h, mesmo com a planilha fechada.

**Por que o menu 🏦 não aparece?**  
Recarregue a planilha. O menu é criado automaticamente pela função `onOpen()` a cada abertura.

**O e-mail não chegou. O que fazer?**  
1. Verifique se autorizou o projeto (passo obrigatório na primeira vez).  
2. Execute `gerarEEnviar` diretamente no editor do Apps Script e veja os logs em **Exibir → Registros**.  
3. Verifique a pasta Spam do e-mail.

**Como atualizar a rentabilidade dos fundos com dados reais da GEART?**  
Edite diretamente as colunas `RENT_DIARIA`, `RENT_MENSAL` e `RENT_ANUAL` na aba `Fundos` da planilha antes de executar o envio. Os valores são lidos dinamicamente a cada execução.

**Como adicionar ou remover um fundo?**  
Edite a aba `Fundos` na planilha: adicione uma nova linha com todos os campos ou apague a linha do fundo inativo.

**Como ver o que foi gerado antes de enviar?**  
Abra o Painel de Gestão e use as abas "JSON" e "Script SQL" na seção "Prévia do Último Arquivo Enviado".

---

## 🔒 Permissões OAuth Utilizadas

| Escopo | Finalidade |
|---|---|
| `spreadsheets` | Ler e escrever na planilha (abas Fundos e Log_Envios) |
| `gmail.send` | Enviar e-mails com os arquivos anexados |
| `script.triggers` | Criar e gerenciar o acionador automático semanal |
| `userinfo.email` | Identificar a conta do usuário logado |

---

## 👨‍💻 Desenvolvedor

**Sérgio Paulo Andrade** — `spandrade@banestes.com.br`  
Departamento de T.I. — Banestes S.A. — v1.0.0
