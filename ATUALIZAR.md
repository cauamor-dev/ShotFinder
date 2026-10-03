# Atualizar sua cópia do ShotFinder

1. Nas duas janelas de comando antigas, pressione **Ctrl+C** para parar o projeto.
2. Guarde seu arquivo **server/.env**. Ele contém as chaves e não está neste pacote.
3. Extraia esta versão em **uma nova pasta**, sem misturar com a anterior.
4. Copie somente o **.env** antigo para a pasta **server** nova.
5. Abra um terminal dentro da nova pasta **server**:

```bat
npm ci
npm start
```

6. Abra outro terminal dentro da nova pasta **client**:

```bat
npm ci
npm start
```

7. Abra **http://localhost:3000** e deixe as duas janelas abertas.

Para testar: busque **Interestelar**, abra um resultado e confira a sinopse e as plataformas. Salve um título em **Minha lista**, atualize a página e confira se ele permanece. Experimente os temas claro/escuro e PT/EN.

Se a lista de plataformas indicar um problema de chave ou autorização, confira a chave do Watchmode e se a conta tem acesso ao Brasil. Não envie o arquivo `.env` ao GitHub.
