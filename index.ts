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

client.on('message_create', async (message) => {
    try {
        if (message.fromMe) {   // Mensagem do atendente
            // Usar .includes para evitar espaços na mensagem
            if (message.body.includes('!!!!! Colocar a mensagem aqui !!!!!!')) {
                return; // Checa para mensagens em massa. Não fazer nada nesse caso.
            }
            const userData = findUserTrackingData(message.to); // Busca os dados do usuário no banco de dados
            // Verifica se o usuário existe e se já escolheu uma opção
            if (userData && userData.option && userData.replyTime && userData.rowNumber) {
                // Verifica se o atendimento terminou
                if (message.body.includes('Muito obrigado! Caso precise de ajuda, mande um')) {
                    clearUserTrackingData(userData.user); // Limpa os dados do usuário
                }
                // Verifica se a mensagem é do atendente e se o usuário está sendo atendido. NÃO contém frases específicas
                else if (!userData.replyTimeCalculated && !message.body.includes('estou encaminhando para atendimento') && !message.body.includes('Estamos fechados no momento') && !message.body.includes('Nossos atendentes estão em horário de almoço')) {
                    const replyTime = new Date(userData.replyTime);
                    const atendenteReplyTime = new Date();

                    // Calcula o tempo de resposta do atendente
                    const timeDiff = calculateWorkingTime(replyTime, atendenteReplyTime);

                    // Atualiza o tempo de resposta do atendente na planilha Excel
                    addRowToExcel([null, null, null, null, atendenteReplyTime.toLocaleString('pt-BR'), timeDiff.toFixed(2)], true, userData.rowNumber);

                    // replyTimeCalculated = true, para evitar que o tempo de resposta seja calculado novamente
                    updateMessageTracking(userData.user, userData.option, userData.replyTime, userData.rowNumber, 1);
                }
                // Verifica se o usuário está sendo redirecionado
                else if (message.body.includes('Você está sendo redirecionado(a) para o setor')) {
                    // Extrai o setor da mensagem
                    const match = message.body.match(/para o setor (.+?)\./);
                    const option = match ? match[1] : ''; // Se encontrar o setor, usa ele. Senão, mantém vazio.

                    const currentTime = new Date();
                    const weekday = currentTime.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);    // Obtém o dia da semana

                    // Adiciona os dados do cliente na planilha Excel e retorna o número da linha
                    const rowNumber = addRowToExcel([userData.user.replace('@c.us', ''), option, currentTime.toLocaleString('pt-BR'), weekday]);

                    if (rowNumber) {
                        // Atualiza os dados do usuário no banco de dados com a opção, tempo e número da linha
                        updateMessageTracking(userData.user, option, currentTime.toISOString(), rowNumber);
                    }
                }
                // Verifica se a próxima mensagem será a nota
                else if (userData.replyTimeCalculated && message.body.includes('Como foi a sua experiência com o atendimento?') && !userData.nota) {
                    updateMessageTracking(userData.user, userData.option, userData.replyTime, userData.rowNumber, 1, 1);    // nota = true
                }
            }
            else if (message.body.includes('Como podemos te ajudar hoje?')) {
                // Se o usuário não existe e vai escolher uma opção, registra o novo usuário no banco de dados
                registerUserInteraction(message.to);
            }
        }
        else {  // Mensagem do cliente
            const userData = findUserTrackingData(message.from);
            // Verifica se o usuário existe e ainda não escolheu uma opção
            if (userData && !userData.option) {
                if (/^[1-8]$/.test(message.body.trim())) {
                    const option = optionsMap[message.body.trim()];     // Obtém a opção escolhida

                    const currentTime = new Date();
                    const weekday = currentTime.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().slice(0, 3);    // Obtém o dia da semana

                    // Adiciona os dados do cliente na planilha Excel e retorna o número da linha
                    const rowNumber = addRowToExcel([userData.user.replace('@c.us', ''), option, currentTime.toLocaleString('pt-BR'), weekday]);

                    if (rowNumber) {
                        // Atualiza os dados do usuário no banco de dados com a opção, tempo e número da linha
                        updateMessageTracking(userData.user, option, currentTime.toISOString(), rowNumber);
                    }
                }
                // Verifica se o cliente digitou '9' ou '10' para excluir o cadastro
                else if (/^(9|10)$/.test(message.body.trim())) {
                    clearUserTrackingData(userData.user);
                }
                else {
                    return;
                }
            }
            else if (userData && userData.nota) {
                // Adiciona a nota no cliente. 1 = Boa e 2 = Ruim
                if (message.body.trim() === '1') {
                    addRowToExcel([null, null, null, null, null, null, 'Boa'], true, userData.rowNumber);
                } else if (message.body.trim() === '2') {
                    addRowToExcel([null, null, null, null, null, null, 'Ruim'], true, userData.rowNumber);
                } else {
                    return;
                }
                // Limpa os dados de rastreamento do usuário no banco de dados
                clearUserTrackingData(userData.user);
            }
        }
    }
    catch (error) {
        logError(error, 'Erro ao executar o comando');       
    }
});