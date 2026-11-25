# Meu Círculo 2027

Agenda social pessoal para ver amigos e família com constância em 2027.

- **Mapa da saudade:** cada pessoa num anel, de "em dia" a "saudade", conforme o tempo desde o último encontro e o ritmo escolhido para ela.
- **Quem chamar agora:** fila de quem está mais atrasado, com convite pronto para o WhatsApp.
- **Agenda:** reserve "janelas" (dias para ver alguém) e marque encontros. Tudo vai para o Google Agenda.
- **Histórico:** todo encontro fica salvo no Firestore, com a linha do tempo de status (planejado → convite enviado → confirmado → aconteceu).

Site estático (HTML + JS), hospedado no GitHub Pages. Dados no Firestore. Login com Google.

## Como os dados ficam guardados

```
circulo/{uid}                  configuração, dias reservados, ids dos eventos de janela no Google
circulo/{uid}/pessoas/{id}     pessoas do círculo
circulo/{uid}/encontros/{id}   encontros, cada um com o campo hist (histórico de status)
```

As regras em `firestore.rules` deixam cada conta ler e escrever só a própria pasta `circulo/{uid}`.
O `firebaseConfig` no código é público por natureza: quem protege os dados são as regras.

## Ligação com o Google Agenda

- **Do Google para o app:** os compromissos do mês aparecem no dia certo, e "Reservar janelas do mês" pula os dias ocupados no horário social (fim de semana a partir das 10h; dias úteis a partir das 18h). O app só guarda a contagem de compromissos por dia, nunca os títulos.
- **Do app para o Google:** cada janela vira um evento de dia inteiro, "Janela social (reservado)", que marca o dia como ocupado. Cada encontro vira "Social: nome", com horário (3 horas) ou dia inteiro. Mudar data, horário ou pessoas atualiza o evento. Cancelar ou excluir o encontro apaga o evento.
- O app só altera eventos que ele mesmo criou (marcados com `extendedProperties.private.meuCirculo = 1`).

**Limite:** o Google entrega uma permissão de agenda que dura cerca de 1 hora, e um site estático não consegue renová-la sozinho. Quando ela expira, aparece "Conectar Google Agenda": um clique reconecta, e tudo que ficou pendente é enviado. Para sincronizar em segundo plano, sem esse clique, seria preciso um backend (Cloud Functions, plano Blaze do Firebase).

## Configuração (uma vez só)

1. **Projeto Firebase:** use um projeto que já existe ou crie um em https://console.firebase.google.com.
2. **Authentication → Método de login → Google:** ative.
3. **Firestore Database:** crie o banco em modo de produção (região sugerida: `southamerica-east1`). Em **Regras**, cole o conteúdo de `firestore.rules`.
   Se o projeto já tem regras de outro app, **não apague nada**: copie só o bloco `match /circulo/{uid}/{document=**} { ... }` para dentro do `match /databases/{database}/documents { ... }` que já existe.
4. **Authentication → Configurações → Domínios autorizados:** adicione `SEU-USUARIO.github.io`.
5. **Google Calendar API:** no Google Cloud Console do mesmo projeto, abra **APIs e serviços → Biblioteca**, procure "Google Calendar API" e clique em **Ativar**.
   Em **Tela de consentimento OAuth**, se o app estiver em modo "Teste", adicione o seu e-mail em "Usuários de teste". Na primeira vez, o Google pode avisar que o app não foi verificado: como o app é seu, clique em "Avançado" e continue.
6. **`firebase-config.js`:** cole o `firebaseConfig` do app da Web (Configurações do projeto → Seus apps).
7. **GitHub Pages:** no repositório, abra **Settings → Pages → Deploy from a branch → main / (root)**.

O site fica em `https://SEU-USUARIO.github.io/meu-circulo-2027/`. Entre com a conta Google da sua agenda.

Enquanto o `firebase-config.js` não estiver preenchido, o app roda em **modo demonstração**: os dados ficam só no navegador e o Google Agenda fica desligado.

## No celular

Abra o site no navegador do celular e use "Adicionar à tela de início". Se o login não abrir no app instalado no iPhone, entre pelo Safari uma vez.

## Backup

Aba **Histórico → Baixar backup (JSON)**. O mesmo arquivo pode ser importado de volta.
