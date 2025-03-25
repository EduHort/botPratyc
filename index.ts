import { clearUserTrackingData, findUserTrackingData, registerUserInteraction, updateMessageTracking } from "./database/db";
import { TrackingData } from "./types/types";
import client from "./util/WhatsAppClient";
import { logError } from "./util/errors";
import { addRowToExcel } from "./util/excel";
import { calculateWorkingTime } from "./util/time";

const optionsMap: { [key: string]: string } = {
    '1': 'Comercial',
    '2': 'Recursos Humanos',
    '3': 'Financeiro',
    '4': 'Marketing',
    '5': 'Comex',
    '6': 'Logística',
    '7': 'Compras',
    '8': 'Suporte Técnico/Engenharia',
    '9': 'Alterar Cadastro',
    '10': 'Cancelar'
};

client.on('message', async (message) => {
    try {
        // Usar .includes para evitar espaços na mensagem
        if (message.fromMe && message.body.includes('')) {
            // Checa para mensagens em massa. Não fazer nada nesse caso.
        }
        else {
            // Busca os dados do usuário no banco de dados
            let userData: TrackingData | undefined;
            if (message.fromMe) {
                userData = findUserTrackingData(message.to);
            }
            else {
                userData = findUserTrackingData(message.from);
            }
            // Verifica se a mensagem indica um novo usuário que precisa ser registrado
            if (message.body.includes('Entendido! 🤗') && message.fromMe && !userData) {
                // Registra o novo usuário no banco de dados
                registerUserInteraction(message.to);
            }
            // Verifica se o usuário existe
            else if (userData) {
                // Verifica se o usuário está esperando para escolher uma opção (1 a 10)
                if (!userData.option) {
                    // Verifica se o usuário escolheu uma opção de setor (1-8)
                    if (/^[1-8]$/.test(message.body.trim())) {
                        const option = optionsMap[message.body.trim()];     // Obtém a opção escolhida

                        const currentTime = new Date();
                        currentTime.setHours(currentTime.getHours() - 3);   // Ajusta o fuso horário para o Brasil
                        const weekday = currentTime.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);    // Obtém o dia da semana

                        // Adiciona os dados do cliente na planilha Excel e retorna o número da linha
                        const rowNumber = addRowToExcel([userData.user.replace('@c.us', ''), option, currentTime.toLocaleString('pt-BR'), weekday]);

                        if (rowNumber) {
                            // Atualiza os dados do usuário no banco de dados com a opção, tempo e número da linha
                            updateMessageTracking(userData.user, option, currentTime.toISOString(), rowNumber);
                        }
                    }
                    // Verifica se o cliente digitou '9' para excluir o cadastro
                    else if (/^9$/.test(message.body.trim())) {
                        updateMessageTracking(userData.user, '9', null, null);
                    }
                }
                else if (userData.option === '9' && !message.fromMe && message.body === '1') {
                    // Tira o usuário do fluxo de atendimento
                    clearUserTrackingData(userData.user);
                }
                else if (userData.option === '9' && !message.fromMe && message.body === '2') {
                    // Limpa os dados de rastreamento do usuário no banco de dados
                    updateMessageTracking(userData.user, null, null, null);
                }
                else if (userData.option === '9' && message.fromMe && message.body.includes('Atendimento concluido. Caso precise')) {
                    // Limpa os dados de rastreamento do usuário no banco de dados
                    updateMessageTracking(userData.user, null, null, null);
                }
                // Verifica se a mensagem é do atendente e se o usuário está sendo atendido
                else if (message.fromMe && userData.replyTime && userData.rowNumber && !userData.replyTimeCalculated) {
                    // Verifica se a mensagem do atendente NÃO contém frases específicas
                    if (!message.body.includes('estou encaminhando para atendimento') || !message.body.includes('Estamos fechados no momento') || !message.body.includes('Nossos atendentes estão em horário de almoço')) {
                        const replyTime = new Date(userData.replyTime);
                        const atendenteReplyTime = new Date();
                        atendenteReplyTime.setHours(atendenteReplyTime.getHours() - 3);   // Ajusta o fuso horário para o Brasil

                        // Calcula o tempo de resposta do atendente
                        const timeDiff = calculateWorkingTime(replyTime, atendenteReplyTime);

                        // Atualiza o tempo de resposta do atendente na planilha Excel
                        addRowToExcel([null, null, null, null, atendenteReplyTime.toLocaleString('pt-BR'), timeDiff.toFixed(2)], true, userData.rowNumber);

                        // replyTimeCalculated = true, para evitar que o tempo de resposta seja calculado novamente
                        updateMessageTracking(userData.user, userData.option, userData.replyTime, userData.rowNumber, true);
                    }
                }
                // Verifica se é hora de dar nota
                else if (message.fromMe && userData.replyTimeCalculated && message.body.includes('De 1 a 5, como você avalia nosso') && userData.rowNumber && userData.replyTime && !userData.nota) {
                    // nota = true
                    updateMessageTracking(userData.user, userData.option, userData.replyTime, userData.rowNumber, true, true);
                }
                else if (!message.fromMe && userData.nota && userData.rowNumber) {
                    // Verifica se a mensagem do cliente contém uma nota (1-5)
                    if (/^[1-5]$/.test(message.body.trim())) {
                        // Adiciona a nota do cliente na planilha Excel
                        addRowToExcel([null, null, null, null, null, null, message.body.trim()], true, userData.rowNumber);

                        // Limpa os dados de rastreamento do usuário no banco de dados, matendo o número
                        updateMessageTracking(userData.user, null, null, null);
                    }
                    // Verifica se o cliente digitou uma resposta inválida, cancelando a atribuição da nota
                    else {
                        // Limpa os dados de rastreamento do usuário no banco de dados, matendo o número
                        updateMessageTracking(userData.user, null, null, null);
                    }
                }
                // Verifica se o usuário está sendo redirecionado
                else if (message.fromMe && message.body.includes('Você está sendo redirecionado(a) para o setor') && userData.option && userData.replyTime) {
                    // Extrai o setor da mensagem
                    const match = message.body.match(/para o setor (.+?)\./);
                    const option = match ? match[1] : ''; // Se encontrar o setor, usa ele. Senão, mantém vazio.
                
                    // Atualiza os dados de rastreamento do usuário, mantendo o setor
                    updateMessageTracking(userData.user, option, null, null);
                }
                
            }
        }
    }
    catch (error) {
        logError(error, 'Erro ao executar o comando');
    }
});
