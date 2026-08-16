// Modelo de clausulas de contrato de prestacao de servicos (grafica/comunicacao visual),
// cobrindo os pontos que ainda nao tem campo proprio no Orcamento (objeto, aprovacao de arte,
// obrigacoes das partes, arquivos, LGPD, rescisao etc). Os campos que ja existem no Orcamento
// (forma de pagamento, multa/juros, garantia, condicao de entrega, cancelamento) nao sao
// repetidos aqui, pra nao duplicar informacao — esse texto complementa aqueles.
//
// Os percentuais/prazos citados aqui vem do que ja foi configurado no restante do documento
// (parametro), entao ficam consistentes com o que a pessoa preencheu no formulario.

export interface ContratoTemplateParams {
  companyName: string;
  companyCnpj?: string;
  companyAddress?: string;
  customerName?: string;
  cpfCnpj?: string;
  customerAddress?: string;
  prazoProducaoTexto?: string; // ja formatado, ex: "10 dias uteis a contar da aprovacao da arte"
}

export function buildContratoClausulasTexto({
  companyName,
  companyCnpj,
  companyAddress,
  customerName,
  cpfCnpj,
  customerAddress,
  prazoProducaoTexto,
}: ContratoTemplateParams): string {
  const nomeEmpresa = companyName || 'a CONTRATADA';
  const digitosDoc = (cpfCnpj || '').replace(/\D/g, '');
  const qualificacaoContratante = !cpfCnpj ? ''
    : digitosDoc.length === 14 ? `, inscrito(a) no CNPJ nº ${cpfCnpj}`
    : `, portador(a) do CPF nº ${cpfCnpj}`;
  const dasPartes = `DAS PARTES

${nomeEmpresa.toUpperCase()}${companyCnpj ? `, inscrita no CNPJ nº ${companyCnpj}` : ''}${companyAddress ? `, com sede em ${companyAddress}` : ''}, doravante denominada CONTRATADA;

${(customerName || 'O(A) CONTRATANTE').toUpperCase()}${qualificacaoContratante}${customerAddress ? `, residente e domiciliado(a) em ${customerAddress}` : ''}, doravante denominado(a) CONTRATANTE;

Resolvem as partes celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que se regerá pelas cláusulas e condições a seguir estipuladas.

`;
  return `${dasPartes}CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a prestação, pela CONTRATADA ao CONTRATANTE, dos serviços de comunicação visual, impressão digital e/ou produtos gráficos descritos no orçamento vinculado a este contrato, incluindo especificações, quantidades e valores ali detalhados, o qual passa a integrar este instrumento para todos os efeitos.

CLÁUSULA 2ª — DA APROVAÇÃO DE ARTE
Quando aplicável, a produção somente terá início após a aprovação expressa da arte/layout pelo CONTRATANTE, feita por escrito (inclusive por WhatsApp, e-mail ou outro meio eletrônico). A CONTRATADA não se responsabiliza por erros de texto, imagem, cor ou informação que constem na arte aprovada pelo CONTRATANTE.

CLÁUSULA 3ª — DAS ALTERAÇÕES APÓS A APROVAÇÃO
Alterações solicitadas após a aprovação da arte e/ou após o início da produção poderão gerar custo adicional e/ou novo prazo de entrega, a ser informado ao CONTRATANTE antes da execução da alteração.

CLÁUSULA 4ª — DO PRAZO
${prazoProducaoTexto ? `O prazo de produção estimado é de ${prazoProducaoTexto}, podendo variar conforme a complexidade do serviço, disponibilidade de insumos e cumprimento, pelo CONTRATANTE, das obrigações de aprovação e pagamento previstas neste contrato.` : 'O prazo de produção será o indicado no orçamento vinculado, podendo variar conforme a complexidade do serviço, disponibilidade de insumos e cumprimento, pelo CONTRATANTE, das obrigações de aprovação e pagamento previstas neste contrato.'}

CLÁUSULA 5ª — DAS OBRIGAÇÕES DA CONTRATADA
a) Executar os serviços conforme especificações aprovadas, com qualidade técnica compatível com o mercado;
b) Informar o CONTRATANTE sobre eventuais imprevistos que possam impactar prazo ou valor;
c) Zelar pela guarda dos materiais e arquivos recebidos do CONTRATANTE durante a execução do serviço;
d) Emitir recibo/nota referente aos valores recebidos.

CLÁUSULA 6ª — DAS OBRIGAÇÕES DO CONTRATANTE
a) Fornecer, em tempo hábil, as informações, arquivos, textos, imagens e demais materiais necessários à execução do serviço;
b) Aprovar a arte/layout dentro do prazo combinado, sob pena de o prazo de entrega ser reajustado proporcionalmente ao atraso na aprovação;
c) Efetuar os pagamentos nas condições e prazos definidos no orçamento vinculado;
d) Retirar o(s) produto(s) no prazo combinado após a notificação de conclusão.

CLÁUSULA 7ª — DO ATRASO NO PAGAMENTO E SUSPENSÃO DOS SERVIÇOS
O atraso no pagamento de qualquer valor devido autoriza a CONTRATADA a suspender a produção e/ou a entrega do serviço até a regularização, sem prejuízo da cobrança de eventual multa e juros previstos no orçamento vinculado, e sem que isso configure descumprimento contratual por parte da CONTRATADA.

CLÁUSULA 8ª — DA ENTREGA, RETIRADA E INSTALAÇÃO
A entrega/retirada do produto ocorrerá no endereço e forma combinados entre as partes. Quando houver instalação incluída no serviço, esta será executada conforme as condições técnicas do local informado pelo CONTRATANTE, sendo de responsabilidade deste garantir acesso e condições adequadas para a execução.

CLÁUSULA 9ª — DA RESPONSABILIDADE SOBRE ARQUIVOS, TEXTOS, IMAGENS E MARCAS FORNECIDOS PELO CONTRATANTE
O CONTRATANTE declara ser detentor dos direitos de uso sobre textos, imagens, logotipos e marcas fornecidos para a execução do serviço, isentando a CONTRATADA de qualquer responsabilidade por eventual violação de direitos autorais ou de propriedade industrial de terceiros decorrente do uso desses materiais.

CLÁUSULA 10ª — DA PROPRIEDADE DOS ARQUIVOS EDITÁVEIS
Os arquivos-fonte/editáveis produzidos pela CONTRATADA permanecem de propriedade desta, salvo acordo expresso em contrário. A entrega do arquivo final ao CONTRATANTE não implica cessão automática dos arquivos em formato editável.

CLÁUSULA 11ª — DO ACEITE E DAS COMUNICAÇÕES ELETRÔNICAS
As partes reconhecem como válidas as comunicações, aprovações e o aceite deste contrato realizados por meios eletrônicos (WhatsApp, e-mail, assinatura eletrônica ou sistema próprio da CONTRATADA), com igual validade jurídica de comunicação por escrito, nos termos da legislação brasileira aplicável.

CLÁUSULA 12ª — DA PROTEÇÃO DE DADOS (LGPD)
Os dados pessoais eventualmente coletados para a execução deste contrato serão tratados em conformidade com a Lei nº 13.709/2018 (LGPD), utilizados exclusivamente para as finalidades relacionadas à prestação do serviço contratado, à emissão de documentos fiscais e à comunicação entre as partes.

CLÁUSULA 13ª — DO USO DE IMAGENS PARA PORTFÓLIO
Salvo manifestação em contrário do CONTRATANTE, a CONTRATADA poderá utilizar fotos do produto/serviço finalizado para fins de divulgação e portfólio, resguardadas informações comerciais sensíveis do CONTRATANTE.

CLÁUSULA 14ª — DA RESCISÃO
O presente contrato poderá ser rescindido por mútuo acordo, ou unilateralmente em caso de descumprimento de suas cláusulas pela outra parte, resguardado o direito da CONTRATADA de reter valores já pagos proporcionalmente ao serviço já executado até a data da rescisão.

CLÁUSULA 15ª — DAS DISPOSIÇÕES GERAIS
Este contrato representa a totalidade do acordado entre as partes quanto ao objeto aqui descrito, substituindo entendimentos verbais anteriores. Eventuais tolerâncias no cumprimento de obrigações não configuram novação ou renúncia de direitos.

CLÁUSULA 16ª — DO FORO
Fica eleito o foro da comarca de domicílio da CONTRATADA para dirimir eventuais controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.`;
}
