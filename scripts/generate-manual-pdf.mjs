import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "docs/manual-operacional-locadora-admin.pdf");
const logo = readFileSync(resolve(root, "public/brand-logo.png"));
mkdirSync(dirname(output), { recursive: true });

const pdf = new jsPDF({ unit: "mm", format: "a4" });
const colors = {
  navy: [7, 14, 24],
  blue: [25, 45, 75],
  gold: [213, 173, 29],
  lightGold: [250, 244, 222],
};
const page = { width: 210, height: 297, left: 18, right: 18, top: 30, bottom: 20 };
let y = page.top;
let sectionNumber = 0;

function header() {
  pdf.setFillColor(...colors.navy);
  pdf.rect(0, 0, page.width, 18, "F");
  pdf.addImage(logo, "PNG", 143, 3, 49, 14);
  pdf.setDrawColor(...colors.gold);
  pdf.setLineWidth(0.55);
  pdf.line(page.left, 20.5, page.width - page.right, 20.5);
}

function footer() {
  const current = pdf.getNumberOfPages();
  pdf.setDrawColor(...colors.gold);
  pdf.line(page.left, 282, page.width - page.right, 282);
  pdf.setFontSize(8);
  pdf.setTextColor(...colors.blue);
  pdf.text("BR-Tecnologias | Manual operacional - Locadora Admin", page.left, 287);
  pdf.text(`Pagina ${current}`, page.width - page.right, 287, { align: "right" });
}

function nextPage() {
  footer();
  pdf.addPage();
  y = page.top;
  header();
}

function ensure(height) {
  if (y + height > page.height - page.bottom) nextPage();
}

function title(text, subtitle) {
  ensure(24);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...colors.blue);
  pdf.text(text, page.left, y);
  y += 7;
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(85);
    pdf.text(subtitle, page.left, y);
    y += 8;
  }
  pdf.setDrawColor(...colors.gold);
  pdf.setLineWidth(0.7);
  pdf.line(page.left, y, page.width - page.right, y);
  y += 7;
}

function section(text, subtitle) {
  sectionNumber += 1;
  if (y > 245) nextPage();
  pdf.setFillColor(...colors.lightGold);
  pdf.roundedRect(page.left, y - 5, 174, 10, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...colors.blue);
  pdf.setFontSize(13);
  pdf.text(`${sectionNumber}. ${text}`, page.left + 4, y + 1);
  y += 9;
  if (subtitle) {
    paragraph(subtitle, { color: 95, size: 9 });
  }
}

function paragraph(text, { color = 45, size = 10, indent = 0, gap = 4 } = {}) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(size);
  pdf.setTextColor(color);
  const lines = pdf.splitTextToSize(text, 174 - indent);
  ensure(lines.length * (size * 0.42) + gap);
  pdf.text(lines, page.left + indent, y);
  y += lines.length * (size * 0.42) + gap;
}

function bullets(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.7);
  pdf.setTextColor(45);
  for (const item of items) {
    const lines = pdf.splitTextToSize(item, 164);
    ensure(lines.length * 4.3 + 3);
    pdf.setFillColor(...colors.gold);
    pdf.circle(page.left + 2, y - 1.1, 1, "F");
    pdf.text(lines, page.left + 7, y);
    y += lines.length * 4.3 + 2.3;
  }
  y += 2;
}

function steps(items) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.7);
  for (let index = 0; index < items.length; index += 1) {
    const lines = pdf.splitTextToSize(items[index], 158);
    ensure(lines.length * 4.3 + 5);
    pdf.setFillColor(...colors.gold);
    pdf.circle(page.left + 4, y - 1.2, 3.3, "F");
    pdf.setTextColor(255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(String(index + 1), page.left + 4, y + 1, { align: "center" });
    pdf.setTextColor(45);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.7);
    pdf.text(lines, page.left + 10, y);
    y += lines.length * 4.3 + 3;
  }
  y += 2;
}

function note(label, text) {
  const lines = pdf.splitTextToSize(text, 158);
  ensure(lines.length * 4.2 + 12);
  pdf.setFillColor(255, 248, 224);
  pdf.roundedRect(page.left, y - 4, 174, lines.length * 4.2 + 8, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(115, 78, 0);
  pdf.text(label, page.left + 5, y + 1);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(85, 65, 25);
  pdf.text(lines, page.left + 5, y + 6);
  y += lines.length * 4.2 + 12;
}

function subheading(text) {
  ensure(12);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);
  pdf.setTextColor(...colors.blue);
  pdf.text(text, page.left, y);
  y += 6;
}

function fields(items) {
  for (const [name, description] of items) {
    const nameLines = pdf.splitTextToSize(name, 43);
    const descriptionLines = pdf.splitTextToSize(description, 118);
    const lineCount = Math.max(nameLines.length, descriptionLines.length);
    const height = lineCount * 4.1 + 5;
    ensure(height);
    pdf.setFillColor(247, 248, 250);
    pdf.roundedRect(page.left, y - 3.5, 174, height, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.8);
    pdf.setTextColor(...colors.blue);
    pdf.text(nameLines, page.left + 4, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(55);
    pdf.text(descriptionLines, page.left + 50, y);
    y += height + 1.5;
  }
  y += 2;
}

function chapter(text, subtitle) {
  nextPage();
  title(text, subtitle);
}

// Capa
pdf.setFillColor(...colors.navy);
pdf.rect(0, 0, page.width, page.height, "F");
pdf.setFillColor(...colors.blue);
pdf.circle(180, 44, 52, "F");
pdf.circle(27, 270, 46, "F");
pdf.addImage(logo, "PNG", page.left, 25, 105, 30);
pdf.setTextColor(255);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(30);
pdf.text("LOCADORA", page.left, 92);
pdf.text("ADMIN", page.left, 105);
pdf.setFont("helvetica", "normal");
pdf.setFontSize(14);
pdf.text("Manual operacional do sistema", page.left, 120);
pdf.setDrawColor(...colors.gold);
pdf.line(page.left, 132, 135, 132);
pdf.setFontSize(10);
pdf.text("Guia de uso para apresentacao ao cliente", page.left, 145);
pdf.text(`Versao 2.0 | ${new Date().toLocaleDateString("pt-BR")}`, page.left, 153);
pdf.setFontSize(8);
pdf.text("Guia completo: frota, clientes, locacoes, manutencao, financeiro e administracao.", page.left, 265);
pdf.addPage();
y = page.top;
header();

title("Como usar este manual", "Ordem recomendada para operar a locadora com seguranca.");
paragraph(
  "Este material explica o objetivo de cada tela, o que preencher e a sequencia de trabalho recomendada. O sistema registra atividades de login, navegacao e alteracoes para apoiar a auditoria da operacao.",
);
section("Sumario do manual");
bullets([
  "Primeiros passos: acesso, navegacao, idiomas, tema e painel.",
  "Cadastros-base: veiculos e clientes, com explicacao campo a campo.",
  "Operacao de locacao: reserva, retirada, contrato, acompanhamento, devolucao e vistoria.",
  "Manutencao: preventivas, corretivas, custos e alertas da frota.",
  "Financeiro: entradas, despesas, saldo multimoeda, margem e desempenho por veiculo.",
  "Administracao: usuarios, documentos, atividades, configuracoes e seguranca.",
  "Rotinas e checklists: abertura do dia, entrega, devolucao, fechamento e solucao de problemas.",
]);

section("Conceitos e status usados no sistema");
fields([
  ["Disponivel", "Veiculo livre para ser selecionado em uma nova locacao."],
  ["Pendente", "Locacao cadastrada, mas o veiculo ainda nao foi entregue ao cliente."],
  ["Entregue", "Veiculo em posse do cliente; o prazo de devolucao deve ser acompanhado."],
  ["Devolvido", "Locacao encerrada depois da vistoria de retorno."],
  ["Preventiva", "Manutencao planejada para reduzir falhas: revisao, oleo, filtros e itens periodicos."],
  ["Corretiva", "Reparo executado depois da identificacao de defeito ou avaria."],
  ["Caucao", "Valor de garantia retido durante a locacao e avaliado na devolucao."],
  ["SRD / USD / EUR", "Moedas suportadas. Valores de moedas diferentes nunca devem ser somados manualmente."],
]);
section("Fluxo principal da operacao");
steps([
  "Cadastre o veiculo antes de oferecelo para locacao. Confirme modelo, placa, categoria e ano.",
  "Cadastre o cliente e confira os dados de contato e documentos exigidos.",
  "Crie a locacao selecionando somente veiculos disponiveis, definindo datas, valores e moeda.",
  "Na retirada, abra a locacao e marque como entregue. Gere o contrato para assinatura.",
  "Na devolucao, preencha a vistoria final, incluindo tanque, limpeza, avarias, observacoes e eventual taxa.",
  "Registre manutencoes sempre que ocorrerem; os custos alimentam automaticamente a visao financeira.",
  "Acompanhe alertas, saldos, seguros, documentos pendentes e logs diariamente.",
]);
note("IMPORTANTE", "Use valores na moeda correta (SRD, USD ou EUR). O painel apresenta cada moeda separadamente; nao some moedas diferentes como se fossem o mesmo valor.");

section("Acesso e navegacao");
bullets([
  "Na tela de login, informe o Login e a Senha recebidos. Se houver erro, revise ambos os campos e tente novamente.",
  "A barra lateral e o menu principal: Painel, Veiculos, Clientes, Locacoes, Manutencao e Financeiro.",
  "O grupo administrativo inclui Usuarios, Documentos, Atividades e Configuracoes.",
  "No topo da tela, use o seletor PT/NL para idioma, o icone de sol/lua para tema e o icone de sair para encerrar a sessao.",
]);

section("Painel inicial", "Visao executiva da operacao.");
bullets([
  "Os indicadores exibem total de veiculos, locacoes ativas, receita e documentos pendentes.",
  "O grafico de receita por veiculo ajuda a identificar quais placas geram maior faturamento.",
  "Atividades recentes mostram os ultimos eventos registrados no sistema.",
  "Use os atalhos no rodape para cadastrar rapidamente veiculo, cliente ou locacao.",
]);
note("LEITURA DOS INDICADORES", "Na versao atual, o card Receita do mes considera as entradas carregadas sem aplicar filtro real de mes, e Documentos pendentes usa uma quantidade fixa. Use as telas Financeiro e Documentos para a conferencia detalhada.");

section("Veiculos - lista e consulta");
bullets([
  "Use a busca por modelo ou placa para localizar um item rapidamente.",
  "Filtre por categoria (Vans, Carros, Particular ou Picape) e por status: todos, disponiveis ou alugados.",
  "Os cards mostram ocupacao, disponibilidade e alertas de seguro vencido ou proximo do vencimento.",
  "Clique na linha do veiculo para consultar a ficha, fotos, historico e informacoes relacionadas.",
]);
note("BOA PRATICA", "Antes de criar uma nova locacao, confirme que o veiculo aparece como disponivel e que o seguro esta regular.");

section("Novo veiculo", "Cadastro da frota.");
steps([
  "Abra Veiculos e clique em Novo.",
  "Preencha Modelo com uma identificacao clara, por exemplo: Toyota Hilux 2023.",
  "Informe a Placa. O sistema converte o texto para letras maiusculas.",
  "Escolha a Categoria correta e preencha o Ano quando disponivel.",
  "Anexe fotos para visualizacao durante o cadastro e clique em Salvar.",
]);
subheading("Campos do cadastro de veiculo");
fields([
  ["Modelo", "Nome comercial do veiculo. Use uma descricao facil de reconhecer, como Toyota Hilux."],
  ["Placa", "Identificacao unica do veiculo. O sistema converte automaticamente para letras maiusculas."],
  ["Categoria", "Escolha VANS, CARROS, PARTICULAR ou PICAPE PARA GARIMPO conforme a operacao."],
  ["Ano", "Ano de fabricacao/modelo. E opcional, mas melhora a identificacao e os relatorios."],
  ["Fotos", "Permite selecionar PNG/JPG e visualizar antes de salvar. Consulte a observacao abaixo."],
  ["Salvar", "Grava o cadastro e retorna para a lista de veiculos."],
  ["Cancelar/Voltar", "Descarta o preenchimento atual e retorna sem criar o veiculo."],
]);
note("ATENCAO", "Na versao atual, as fotos selecionadas servem como visualizacao no momento do cadastro; para guarda permanente deve ser configurado um servico de armazenamento de arquivos.");

section("Clientes - lista e consulta");
bullets([
  "Use a busca por nome, CPF ou WhatsApp e filtre a base por Suriname ou BR.",
  "Os indicadores resumem total de clientes, origem e pendencias documentais.",
  "Clique em um cliente para ver seus dados cadastrais, documentos informados e historico de locacoes.",
  "Priorize a regularizacao dos clientes indicados com documentos pendentes antes de liberar uma locacao.",
]);

section("Novo cliente", "Cadastro de dados e documentos.");
steps([
  "Abra Clientes e clique em Novo.",
  "Preencha Nome completo. Informe RG, CPF, endereco e WhatsApp sempre que disponiveis.",
  "E-mail e opcional, mas recomendado para comunicacao e envio de documentos.",
  "Marque a opcao Suriname quando o cliente for do pais. Isso libera os campos de Passaporte e Identiteitskaart.",
  "Anexe CNH; para clientes do Suriname, anexe tambem passaporte e identiteitskaart. Clique em Salvar.",
]);
subheading("Campos do cadastro de cliente");
fields([
  ["Nome", "Nome completo conforme o documento oficial. E o principal campo obrigatorio."],
  ["RG e CPF", "Documentos brasileiros. Digite exatamente como apresentados pelo cliente."],
  ["Endereco", "Endereco residencial completo, incluindo cidade e referencias quando necessarias."],
  ["WhatsApp", "Numero com codigo do pais e DDD para contato durante a locacao."],
  ["E-mail", "Campo opcional usado como contato complementar."],
  ["Suriname", "Ative para identificar cliente surinames e exibir Passaporte e Identiteitskaart."],
  ["CNH", "Imagem ou PDF da habilitacao apresentada pelo motorista."],
  ["Passaporte", "Documento adicional exibido quando a opcao Suriname esta marcada."],
  ["Identiteitskaart", "Carteira de identidade surinamesa, exibida quando aplicavel."],
]);
note("CONFERENCIA", "Antes de contratar, compare os dados digitados com os documentos apresentados pelo cliente.");

section("Locacoes - acompanhamento");
bullets([
  "A tela resume locacoes em curso, pendentes de retirada, devolvidas, vencimentos proximos e atrasos.",
  "Use as abas de status para filtrar: Pendente, Entregue ou Devolvido.",
  "A busca encontra locacoes por placa, modelo do veiculo ou nome do cliente.",
  "Abra a locacao pela linha correspondente para executar as etapas de entrega e devolucao.",
]);

section("Nova locacao", "Registro comercial e reserva.");
steps([
  "Abra Locacoes e clique em Novo.",
  "Selecione o Veiculo. Apenas veiculos disponiveis sao exibidos.",
  "Selecione o Cliente ja cadastrado.",
  "Informe data de retirada e data de devolucao. A devolucao deve ser posterior a retirada.",
  "Informe o valor do aluguel e escolha a moeda: SRD, USD ou EUR.",
  "Preencha seguro, caucao e observacao do seguro quando aplicavel. Salve a locacao.",
]);
subheading("Campos da nova locacao");
fields([
  ["Veiculo", "Selecione um veiculo disponivel. Se ele nao aparecer, confira se existe outra locacao ativa."],
  ["Cliente", "Selecione um cliente previamente cadastrado e com documentos conferidos."],
  ["Data de retirada", "Dia em que o cliente recebe o veiculo."],
  ["Data prevista de devolucao", "Dia combinado para o veiculo retornar. Nao pode ser anterior a retirada."],
  ["Valor do aluguel", "Preco principal acordado para o periodo; campo obrigatorio."],
  ["Moeda", "Escolha SRD, USD ou EUR conforme o valor negociado."],
  ["Seguro adicional", "Valor extra de cobertura, quando houver. Deixe vazio se nao aplicavel."],
  ["Observacao do seguro", "Descreva cobertura, franquia ou condicao relevante."],
  ["Deposito (caucao)", "Garantia recebida do cliente. Deixe vazio quando nao houver."],
]);
note("RESULTADO", "Ao salvar, a locacao fica pendente, o veiculo ja e marcado como indisponivel e uma entrada financeira do aluguel e criada automaticamente. Ele volta a ficar disponivel somente quando a devolucao e concluida.");

section("Detalhe da locacao - retirada, contrato e devolucao");
bullets([
  "O topo informa status, periodo, cliente, placa e progresso da locacao.",
  "Em Valores, revise aluguel, seguro, caucao e total a receber antes da retirada.",
  "Com status Pendente, gere o contrato em PDF, realize a vistoria de retirada e clique em Marcar como entregue.",
  "Com status Entregue, acompanhe o prazo. O painel destaca devolucoes proximas e atrasadas.",
  "Na devolucao, preencha a vistoria: tanque, limpeza, sem avarias, observacoes e taxa, se houver. Entao conclua a devolucao.",
  "Depois de devolvida, a locacao e encerrada e o veiculo volta a ficar disponivel.",
]);
subheading("Checklist de entrega ao cliente");
steps([
  "Confirme identidade do cliente, habilitacao e documentos apresentados.",
  "Revise placa, modelo, periodo, valor, seguro e caucao na tela.",
  "Gere o contrato em PDF e obtenha as assinaturas necessarias.",
  "Registre a condicao de retirada: tanque, limpeza, avarias e observacoes.",
  "Somente depois da conferencia, clique em Marcar como entregue.",
]);
subheading("Checklist de devolucao");
fields([
  ["Tanque", "Marque quando o nivel de combustivel estiver conforme o combinado."],
  ["Limpo", "Marque quando a limpeza estiver em condicao aceita pela locadora."],
  ["Sem avarias", "Marque somente depois da inspecao visual do veiculo."],
  ["Taxa de nao conformidade", "Informe cobranca por combustivel, limpeza, atraso ou avaria, se aplicavel."],
  ["Observacao", "Descreva objetivamente qualquer diferenca, dano, cobranca ou acordo com o cliente."],
  ["Fechar locacao", "Conclui o ciclo, registra a vistoria e devolve a disponibilidade ao veiculo."],
]);
note("VISTORIA", "Registre avarias e taxas com descricao objetiva. Isso cria historico e facilita a conferencia da caucao.");

section("Manutencao", "Controle de custos e saude da frota.");
bullets([
  "A tela apresenta totais por moeda, proporcao de preventivas e corretivas, veiculos com maior custo e itens que exigem atencao.",
  "Use abas para tipo de manutencao, filtro por moeda e busca por peca, modelo ou placa.",
  "O bloco de atencao identifica veiculos sem manutencao recente e reincidencia de manutencoes corretivas.",
]);
steps([
  "Clique em Novo.",
  "Selecione o veiculo, o tipo (Preventiva ou Corretiva), as pecas ou servicos executados e o custo.",
  "Escolha a moeda, informe a data real do servico e acrescente observacoes relevantes.",
  "Clique em Salvar. O custo passa a compor o financeiro automaticamente.",
]);
subheading("Campos da manutencao");
fields([
  ["Veiculo", "Selecione o veiculo que recebeu o servico."],
  ["Tipo", "Preventiva para servico planejado; Corretiva para defeito, falha ou reparo."],
  ["Data", "Data real da execucao do servico ou entrada na oficina."],
  ["Pecas/servicos", "Descreva itens trocados e atividades realizadas, por exemplo: oleo, filtro e alinhamento."],
  ["Custo", "Valor total pago pelo servico. Use ponto ou o formato aceito pelo navegador."],
  ["Moeda", "SRD, USD ou EUR correspondente ao pagamento."],
]);
note("INDICADORES", "O sistema destaca veiculos sem revisao ha 90 dias ou mais e veiculos com duas ou mais corretivas nos ultimos 90 dias. Use esses alertas para agendar revisoes e investigar reincidencias.");

section("Financeiro", "Leitura de receitas, despesas e alertas.");
bullets([
  "Os tres cards principais mostram saldo, entradas e despesas separadamente para SRD, USD e EUR.",
  "Use o periodo Hoje, Semana ou Mes como referencia visual do painel.",
  "Filtre os lancamentos por moeda, tipo (entrada ou despesa) e texto de busca.",
  "Consulte os veiculos com melhor resultado liquido e os alertas de seguros vencidos ou proximos do vencimento.",
  "Entradas de locacoes e despesas de manutencao sao registradas pelo fluxo operacional; confirme os dados na origem.",
]);
subheading("Como interpretar os indicadores");
fields([
  ["Saldo por moeda", "Entradas menos despesas, exibidas separadamente em SRD, USD e EUR."],
  ["Entradas", "Receitas geradas pelas locacoes e demais movimentos positivos registrados pelo fluxo."],
  ["Despesas", "Custos de manutencao e demais movimentos negativos gerados pela operacao."],
  ["Top veiculos", "Ranking pelo resultado liquido: receitas menos despesas vinculadas ao veiculo."],
  ["Saude financeira", "Percentual de margem liquida sobre as entradas registradas."],
  ["Seguros vencidos", "Exigem acao imediata antes de disponibilizar o veiculo."],
  ["A vencer em 30 dias", "Lista para planejamento antecipado da renovacao."],
  ["Filtros", "Busca por descricao/modelo/placa, moeda e tipo de movimento."],
]);
note("ANALISE", "O saldo positivo em uma moeda nao compensa automaticamente saldo negativo em outra. Avalie cada moeda separadamente.");
note("FILTRO DE PERIODO", "Os botoes Hoje, Semana e Mes ainda funcionam apenas como selecao visual e nao alteram os calculos. Os filtros efetivos do extrato sao moeda, tipo e busca.");

section("Usuarios", "Consulta de contas internas.");
bullets([
  "A tela lista Login, Nome, E-mail, Perfil e Status.",
  "As contas exibidas possuem acesso total no sistema atual.",
  "Use esta tela para conferir se uma conta esta ativa antes de compartilhar o acesso.",
]);
note("SOMENTE CONSULTA", "A tela atual nao permite criar, editar, desativar ou excluir usuarios. Todas as contas listadas possuem acesso total; alteracoes de acesso dependem do administrador tecnico.");
note("SENHAS", "Nunca compartilhe uma unica conta entre operadores quando for necessario identificar quem executou cada acao. Senhas devem ser individuais, fortes e trocadas quando houver desligamento ou suspeita de acesso indevido.");

section("Documentos", "Geracao de contratos e pendencias.");
steps([
  "Abra Documentos para visualizar todas as locacoes cadastradas.",
  "Localize a locacao pelo veiculo, placa, cliente e periodo.",
  "Clique em PDF para gerar o contrato em formato pronto para baixar ou imprimir.",
  "Na area Documentos pendentes, gere os modelos indicados enquanto o documento definitivo nao estiver disponivel.",
]);

section("Atividades (logs)", "Auditoria e exportacao.");
bullets([
  "A tela registra login, navegacao, cliques, cadastros, manutencoes e preferencias.",
  "Filtre por usuario, categoria ou termo de busca para encontrar um evento.",
  "Clique em uma linha para consultar o detalhe do registro.",
  "Use o botao CSV para baixar os resultados filtrados e apresentar ou arquivar a auditoria.",
]);

section("Configuracoes", "Preferencias locais do operador.");
bullets([
  "Perfil: permite testar a alteracao do nome e e-mail exibidos no formulario; consulte a observacao de persistencia abaixo.",
  "Idioma: alterne entre Portugues (BR) e Nederlands.",
  "Tema: selecione Claro ou Escuro conforme preferencia de visualizacao.",
]);
note("PERSISTENCIA", "Nome e e-mail em Configuracoes sao demonstrativos nesta versao: o botao Salvar exibe confirmacao, mas nao grava essas alteracoes no banco. Idioma fica salvo no navegador; tema vale para a interface atual.");
note("ENCERRAMENTO", "Ao terminar o uso, clique no icone de sair no canto superior direito. Evite deixar a sessao aberta em computador compartilhado.");

section("Seguranca e boas praticas");
bullets([
  "Nao compartilhe senha por mensagens abertas nem deixe credenciais anotadas perto do computador.",
  "Sempre encerre a sessao em computadores compartilhados.",
  "Antes de entregar um veiculo, confira documentos, contrato, valores, seguro e vistoria.",
  "Nao altere dados apenas para fazer um alerta desaparecer; corrija a informacao na origem.",
  "Exporte os logs quando precisar guardar evidencia de auditoria.",
  "Mantenha o navegador e o sistema operacional atualizados.",
  "Solicite backup periodico do banco de dados ao responsavel tecnico.",
]);

section("O que e automatico e o que depende do operador");
fields([
  ["Automatico", "Atualizacao dos paineis, calculo de saldos, agrupamento por moeda, alertas de prazo/seguro, historico e registro de atividades."],
  ["Operador", "Conferencia documental, escolha correta de datas/moedas, assinatura do contrato, vistoria fisica, cobranca e decisao sobre caucao."],
  ["Financeiro", "As entradas de locacao e despesas de manutencao dependem dos cadastros operacionais corretos."],
  ["Arquivos", "Na versao atual, anexos selecionados em veiculos/clientes nao possuem armazenamento permanente configurado."],
]);

section("Limitacoes atuais que o operador deve conhecer");
fields([
  ["Edicao e exclusao", "Nao existem telas para editar ou excluir veiculos, clientes e locacoes ja cadastrados."],
  ["Fotos e documentos", "Uploads de veiculo, CNH, passaporte e identiteitskaart mostram preview local, mas nao sao enviados para armazenamento permanente."],
  ["Financeiro manual", "Nao ha cadastro manual de lancamentos; locacoes, manutencoes e taxas de devolucao geram os movimentos automaticamente."],
  ["Periodo financeiro", "Hoje, Semana e Mes nao filtram os numeros nesta versao."],
  ["Perfil", "Nome e e-mail alterados em Configuracoes nao sao persistidos."],
  ["Usuarios", "Somente listagem, sem cadastro, perfis de permissao ou desativacao pela interface."],
  ["Vistoria de retirada", "O sistema permite marcar a entrega, mas ainda nao apresenta um formulario completo de vistoria de saida."],
  ["Seguro do veiculo", "A validade e exibida nos paineis, mas nao existe campo para informa-la no cadastro atual de veiculo."],
]);

section("Solucao de problemas comuns");
fields([
  ["Login recusado", "Confirme maiusculas/minusculas, login e senha. Atualize a pagina e tente novamente. Persistindo, solicite ao administrador a verificacao da conta."],
  ["Veiculo nao aparece", "Verifique se esta cadastrado, disponivel e sem locacao ativa. Consulte a ficha do veiculo e a lista de locacoes."],
  ["Cliente nao aparece", "Confirme se o cadastro foi salvo. Use a busca por nome, CPF ou WhatsApp."],
  ["Nao consigo salvar", "Revise os campos obrigatorios e o formato de datas/valores. Observe a mensagem exibida na tela."],
  ["Data de devolucao invalida", "Escolha uma data igual ou posterior a data de retirada."],
  ["Valor incorreto no financeiro", "Abra a locacao ou manutencao que originou o lancamento e confira valor e moeda."],
  ["Favicon/tela antiga", "Atualize com Ctrl+F5 no Windows ou Cmd+Shift+R no macOS para limpar o cache visual."],
  ["Sistema indisponivel", "Registre horario e mensagem exibida e contate o suporte. Evite repetir o mesmo cadastro varias vezes."],
]);

section("Rotina diaria recomendada");
steps([
  "Inicio do dia: consulte Painel, alertas de seguro, locacoes com devolucao hoje e atrasos.",
  "Antes de cada retirada: valide cliente, documentos, veiculo, valores, caucao e contrato.",
  "No retorno: execute a vistoria, registre taxas quando aplicavel e conclua a devolucao.",
  "Ao receber nota ou oficina: lance a manutencao no mesmo dia.",
  "Fim do dia: revise Financeiro, documentos pendentes e Atividades; exporte CSV quando necessario.",
]);

section("Checklist de abertura do dia");
bullets([
  "Confirmar que o Painel carregou e que os indicadores estao atualizados.",
  "Verificar devolucoes previstas para hoje e locacoes atrasadas.",
  "Conferir seguros vencidos ou com vencimento em ate 30 dias.",
  "Revisar veiculos sem manutencao recente e corretivas reincidentes.",
  "Confirmar a agenda de retiradas, clientes, contratos e veiculos preparados.",
]);

section("Checklist de fechamento do dia");
bullets([
  "Confirmar que todas as retiradas realizadas foram marcadas como Entregue.",
  "Confirmar que todas as devolucoes recebidas foram vistoriadas e fechadas.",
  "Revisar taxas, caucao, observacoes e divergencias registradas.",
  "Conferir entradas e despesas por moeda no Financeiro.",
  "Registrar manutencoes e documentos recebidos no mesmo dia.",
  "Verificar Atividades e encerrar a sessao.",
]);

section("Fluxo resumido para treinamento");
steps([
  "Entre com seu usuario e senha e consulte os alertas do Painel.",
  "Cadastre primeiro o veiculo e depois o cliente.",
  "Crie a locacao com datas, valor, moeda, seguro e caucao.",
  "Gere o contrato, confira a retirada e marque o veiculo como entregue.",
  "Acompanhe prazo, financeiro, seguro e manutencao durante o periodo.",
  "Na volta, realize a vistoria, registre taxa/observacao e feche a locacao.",
  "Confira Financeiro, Documentos e Atividades para concluir a operacao.",
]);
note("SUPORTE", "Ao solicitar ajuda, informe a tela, o horario, o usuario, a acao executada e a mensagem exibida. Esses dados permitem localizar o evento nos logs com mais rapidez.");

footer();
pdf.setProperties({
  title: "Manual completo - Locadora Admin",
  subject: "Guia operacional completo do sistema de locacao de veiculos",
  author: "BR-Tecnologias",
});
pdf.save(output);
console.log(output);
