# 🏦 Projeto JSON — Gerenciador de Fundos Banestes

Ferramenta de gestão de fundos de investimento do Banestes, desenvolvida em **Google Apps Script** para rodar diretamente no Google Sheets.

---

## 📌 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Geração de JSON** | Gera o JSON atualizado dos fundos com dados de rentabilidade extraídos da tabela GEART |
| **Geração de Script SQL** | Gera o script SQL de UPDATE para carga no mainframe |
| **Envio Automático por E-mail** | Envia ambos os arquivos como anexo por e-mail com layout HTML personalizado |
| **Acionador Automático** | Configura envio toda segunda-feira às 8h |
| **Painel de Gestão (Sidebar)** | Exibe status, última atualização, prévia dos arquivos e lista de fundos |
| **Base de Dados** | Aba "Fundos" na planilha com todas as informações dos fundos ativos |
| **Log de Envios** | Aba "Log_Envios" com histórico de todos os envios realizados |

---

## 📁 Estrutura de Arquivos

```
Projeto_Json/
├── appsscript.json       # Manifesto do projeto GAS (permissões e configurações)
├── Code.gs               # Script principal (lógica de negócio, triggers, API do painel)
├── Sidebar.html          # Interface HTML do painel lateral de gestão
├── EmailTemplate.html    # Template HTML do e-mail enviado aos destinatários
└── README.md             # Esta documentação
```

---

## 📧 Destinatários de E-mail

| E-mail | Função | Status |
|---|---|---|
| `spandrade@banestes.com.br` | Desenvolvedor (testes) | ✅ **Ativo** |
| `iodutra@banestes.com.br` | Igor Dutra (analista) | 💤 Comentado — ativar após validação |
| `jcrepossi@banestes.com.br` | Juliana Crepossi (chefe) | 💤 Comentado — ativar após validação |

> Para ativar os analistas, edite `Code.gs` e descomente as linhas em `ANALYST_EMAILS` e na função `enviarEmail`.

---

## 🚀 Como Usar

### 1. Importar para o Google Apps Script

1. Abra o [Google Sheets](https://sheets.google.com) e crie uma planilha.
2. Vá em **Extensões → Apps Script**.
3. Copie o conteúdo de `Code.gs`, `Sidebar.html` e `EmailTemplate.html` para os arquivos correspondentes no editor do Apps Script.
4. Copie `appsscript.json` em **Projeto → appsscript.json** (habilite o editor de manifesto em Configurações).
5. Salve o projeto.

### 2. Primeira Execução

1. Recarregue a planilha — o menu **🏦 Gerenciador Fundos** aparecerá.
2. Clique em **📊 Abrir Painel de Gestão** para abrir o painel lateral.
3. Clique em **🚀 Gerar e Enviar Agora** para a primeira geração e envio dos arquivos.
4. (Opcional) Clique em **⏰ Ativar Envio Automático** para agendar envios semanais.

### 3. Autorizar Permissões

Na primeira execução, o Google solicitará autorização para:
- Acessar o Google Sheets
- Enviar e-mails pelo Gmail
- Gerenciar acionadores de tempo

---

## 🗄️ Estrutura da Planilha

### Aba `Fundos` (Base de Dados)

| Coluna | Descrição |
|---|---|
| `FNDCD` | Código do fundo |
| `NOME` | Nome do fundo |
| `FNDCTFND` | Tipo do fundo |
| `FNDCLSRISC` | Classificação de risco (Muito Baixo / Baixo / Médio / Alto) |
| `FNDCLSCVM` | Classificação CVM |
| `FNDSUBCVM` | Sub-classificação CVM |
| `FNDTOAMB` | Tipo ANBIMA |
| `FNDTXSIMU` | Taxa de simulação |
| `FNDCOTDIAUTIL` | Cotação em dia útil (S/N) |
| `RENT_DIARIA` | Rentabilidade diária (fonte: GEART) |
| `RENT_MENSAL` | Rentabilidade mensal (fonte: GEART) |
| `RENT_ANUAL` | Rentabilidade anual (fonte: GEART) |

### Aba `Log_Envios`

Registra automaticamente cada envio: data/hora, destinatários, arquivos gerados e status.

---

## ⚙️ Regra de Risco (FNDCLSRISC)

| Valor | Código |
|---|---|
| Muito Baixo | 0 |
| Baixo | 1 |
| Médio | 2 |
| Alto | 3 |

---

## 👨‍💻 Desenvolvedor

**Sergio Paulo Andrade** — `spandrade@banestes.com.br`  
Departamento de T.I. — Banestes S.A.
