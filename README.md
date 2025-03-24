Guia de Instalação e Uso (Windows)

Este guia explica como configurar e rodar o projeto no Windows, utilizando Node.js, npm e PM2.

1. Verificar se Node.js e npm estão instalados

Abra o Prompt de Comando (cmd) e digite:

node -v
npm -v

Se ambos os comandos retornarem uma versão, significa que já estão instalados. Caso contrário, baixe e instale o Node.js pelo site oficial: https://nodejs.org/. O npm é instalado automaticamente com o Node.js.

2. Clonar o repositório e instalar dependências

Crie uma nova pasta e abra o terminal nela. Em seguida, execute os comandos:

git clone https://github.com/EduHort/botPraticc.git
cd botPraticc
npm install

3. Instalação e uso do PM2

Instale o PM2 globalmente:

npm install -g pm2

Comandos básicos do PM2:

pm2 start --name "meuProjeto"                # Iniciar o projeto com um nome personalizado
pm2 stop MeuProjeto                          # Parar a instância
pm2 restart MeuProjeto                       # Reiniciar a instância
pm2 logs MeuProjeto                          # Ver logs
pm2 monit                                    # Monitoramento em tempo real

Para iniciar o projeto automaticamente após reiniciar o PC (OPCIONAL):

pm2 startup
pm2 save

4. Compilar e iniciar o projeto em TypeScript

Antes de rodar o projeto, é necessário compilá-lo para JavaScript:

npm run build

Isso gerará os arquivos compilados. Agora, inicie o projeto com PM2:

pm2 start index.js --name "meuProjeto"
pm2 logs meuProjeto

Verifique o QR-code do WhatsApp nos logs. Caso a autenticação falhe:

Exclua as pastas .wwebjs_cache e .wwebjs_auth.

pm2 stop meuProjeto
rm -rf .wwebjs_cache .wwebjs_auth

Reinicie o projeto e tente novamente.

npm run build
pm2 start index.js --name "meuProjeto"
pm2 logs meuProjeto

5. Manipulação do arquivo Excel

O projeto gera um arquivo Excel "respostas" na raiz da pasta com as respostas. Não abra esse arquivo diretamente na pasta do projeto, pois isso pode impedir o funcionamento do sistema. Se precisar visualizar os dados:

Copie o arquivo para outro local.

Abra a cópia.

6. Atualização do projeto com Git

Antes de atualizar o código, pare a execução do projeto com:

pm2 stop meuProjeto

Em seguida, atualize o repositório:

git pull origin main
npm install
npm run build

Depois, reinicie o projeto normalmente:

pm2 start dist/index.js --name "meuProjeto"

Agora seu projeto está configurado e pronto para rodar! 🚀