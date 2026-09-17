import type { LegalDoc, LegalLang } from "./types";

const en: LegalDoc = {
  title: "Terms of Use",
  summary: "The rules for using ResumeTailor: what the service does, how credits and payments work, what you may and may not do, and the limits of our responsibility.",
  sections: [
    { h: "1. Agreement", body: ["By creating an account or using ResumeTailor you agree to these Terms and to the Privacy Policy. If you don't agree, please don't use the service. The operator is identified at the top of this page."] },
    { h: "2. What the service does", body: [
      "ResumeTailor uses artificial intelligence to help you write job-application material: a résumé tailored to a posting, cover letters, recruiter e-mails, LinkedIn texts, interview preparation and practice, plus free tools (ATS check, fit check, application tracker).",
      "Everything the AI writes is a draft. Read it, correct it and decide what to send. The service does not guarantee interviews, offers or any hiring result, and scores (match, ATS, fit, interview) are guides, not predictions.",
    ] },
    { h: "3. Your account", body: [{ list: [
      "Give a real e-mail address you control; one account per person.",
      "Keep your password to yourself. You are responsible for what happens in your account; tell us if you suspect misuse, and use “Sign out of every device” in your account page.",
      "The service is meant for adults; people under 18 need a parent or guardian's involvement.",
    ] }] },
    { h: "4. Credits and payments", body: [{ list: [
      "Previews are free. One credit unlocks one full kit. New accounts get one free credit; we may withhold it when the same person or connection opens several accounts.",
      "Credits are sold in prepaid packs. The price, the currency and the payment provider are shown before you pay: Mercado Pago charges in Brazilian reais (BRL); Stripe charges in US dollars (USD). Your bank may convert and add fees.",
      "There is no subscription and no automatic renewal: you are charged only when you buy a pack.",
      "Credits do not expire, cannot be transferred and have no cash value.",
      "Credits are added once the payment provider confirms the payment (Pix is usually immediate; boleto can take up to 2 business days).",
      "If a payment is refunded or charged back, the credits from it are removed from your balance (credits already used cannot be removed).",
    ] }, "Refunds and the right of withdrawal are described in the Refund Policy."] },
    { h: "5. Acceptable use", body: [
      "You agree not to:",
      { list: [
        "use the service to deceive employers — for example, to claim experience, degrees or results you don't have (the AI is built not to invent them, and you are responsible for what you send);",
        "upload content that is unlawful, infringes someone else's rights, or contains other people's personal data without a legal basis;",
        "publish a web résumé that impersonates someone else;",
        "access the service by automated means, scrape it, bypass its limits, resell it, or try to break its security.",
      ] },
      "We may limit, suspend or close accounts that break these rules, and take down public web résumés that do.",
    ] },
    { h: "6. Your content", body: [
      "What you write and what the service generates for you is yours. You give us permission to store and process it only to provide the service (including sending it to the processors listed in the Privacy Policy). Publishing a web résumé is your choice; you can switch it off or delete it at any time.",
    ] },
    { h: "7. Availability and changes", body: ["We work to keep the service available, but it may be interrupted for maintenance, provider outages or reasons beyond our control — for example, when the AI provider is down we pause generation. We may change or discontinue features; credits you already paid for stay usable for the features that consume them, or are refunded if that is no longer possible."] },
    { h: "8. Intellectual property", body: ["The ResumeTailor name, design and software belong to the operator. These Terms do not transfer any of those rights to you beyond using the service."] },
    { h: "9. Liability", body: ["To the extent the law allows, the service is provided as it is, and we are not liable for indirect losses or for decisions made by employers. Nothing in these Terms limits the rights you have as a consumer under the Brazilian Consumer Defense Code (CDC) or other mandatory law."] },
    { h: "10. Ending", body: ["You can delete your account at any time from your account page. We may close accounts that break these Terms, and we will tell you why when we can."] },
    { h: "11. Law and disputes", body: ["These Terms are governed by Brazilian law. Consumers may bring claims in the courts of their own domicile. Before going to court, please write to us — most problems are solved by a message."] },
    { h: "12. Changes to these Terms", body: ["We update the date at the top when these Terms change. Significant changes are announced on the site before they take effect; continuing to use the service after that means you accept them."] },
  ],
};

const pt: LegalDoc = {
  title: "Termos de Uso",
  summary: "As regras pra usar o ResumeTailor: o que o serviço faz, como funcionam créditos e pagamentos, o que pode e o que não pode, e os limites da nossa responsabilidade.",
  sections: [
    { h: "1. Aceite", body: ["Ao criar uma conta ou usar o ResumeTailor, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use o serviço. O responsável pelo serviço está identificado no topo desta página."] },
    { h: "2. O que o serviço faz", body: [
      "O ResumeTailor usa inteligência artificial pra te ajudar a escrever o material de uma candidatura: currículo ajustado a uma vaga, cartas de apresentação, e-mails pra recrutadores, textos de LinkedIn, preparação e treino de entrevista, além de ferramentas grátis (teste de ATS, teste de fit, controle de candidaturas).",
      "Tudo o que a IA escreve é um rascunho. Leia, corrija e decida o que enviar. O serviço não garante entrevista, proposta nem qualquer resultado de contratação, e as notas (compatibilidade, ATS, fit, entrevista) são orientações, não previsões.",
    ] },
    { h: "3. Sua conta", body: [{ list: [
      "Use um e-mail real que seja seu; uma conta por pessoa.",
      "Não compartilhe sua senha. Você responde pelo que acontece na sua conta; avise a gente se suspeitar de uso indevido e use “Sair de todos os dispositivos” na página da conta.",
      "O serviço é pensado pra adultos; menores de 18 anos precisam do acompanhamento de pai, mãe ou responsável.",
    ] }] },
    { h: "4. Créditos e pagamentos", body: [{ list: [
      "As prévias são grátis. Um crédito libera um kit completo. Contas novas ganham um crédito grátis; podemos não conceder esse crédito quando a mesma pessoa ou conexão abre várias contas.",
      "Os créditos são vendidos em pacotes pré-pagos. O preço, a moeda e o meio de pagamento aparecem antes de você pagar: o Mercado Pago cobra em reais (BRL); o Stripe cobra em dólares americanos (USD), e seu banco pode converter e cobrar IOF e tarifas.",
      "Não existe assinatura nem renovação automática: você só é cobrado quando compra um pacote.",
      "Os créditos não vencem, não podem ser transferidos e não podem ser trocados por dinheiro.",
      "Os créditos entram quando o meio de pagamento confirma o pagamento (Pix costuma ser na hora; boleto pode levar até 2 dias úteis).",
      "Se um pagamento for estornado ou contestado, os créditos dele saem do seu saldo (créditos já usados não podem ser retirados).",
    ] }, "Reembolso e direito de arrependimento estão na Política de Reembolso."] },
    { h: "5. Uso permitido", body: [
      "Você concorda em não:",
      { list: [
        "usar o serviço pra enganar empregadores — por exemplo, declarando experiência, formação ou resultados que você não tem (a IA foi feita pra não inventar, e você responde pelo que envia);",
        "enviar conteúdo ilegal, que viole direitos de terceiros ou que contenha dados pessoais de outras pessoas sem base legal;",
        "publicar um currículo na web se passando por outra pessoa;",
        "acessar o serviço de forma automatizada, fazer scraping, burlar os limites, revender o serviço ou tentar quebrar a segurança dele.",
      ] },
      "Podemos limitar, suspender ou encerrar contas que descumpram essas regras, e tirar do ar currículos publicados que as violem.",
    ] },
    { h: "6. Seu conteúdo", body: [
      "O que você escreve e o que o serviço gera pra você é seu. Você autoriza a gente a guardar e tratar esse conteúdo só pra prestar o serviço (inclusive enviando aos operadores listados na Política de Privacidade). Publicar um currículo na web é escolha sua; dá pra desligar ou apagar quando quiser.",
    ] },
    { h: "7. Disponibilidade e mudanças", body: ["A gente trabalha pra manter o serviço no ar, mas ele pode ficar fora por manutenção, falha de fornecedores ou motivos fora do nosso controle — por exemplo, quando a IA do fornecedor cai, a geração fica pausada. Podemos mudar ou encerrar recursos; créditos já pagos continuam valendo para os recursos que os consomem, ou são reembolsados se isso deixar de ser possível."] },
    { h: "8. Propriedade intelectual", body: ["O nome, o design e o software do ResumeTailor pertencem ao responsável pelo serviço. Estes Termos não transferem nenhum desses direitos a você além do uso do serviço."] },
    { h: "9. Responsabilidade", body: ["Na medida permitida pela lei, o serviço é oferecido no estado em que se encontra, e não respondemos por perdas indiretas nem por decisões de empregadores. Nada nestes Termos limita os direitos que você tem como consumidor pelo Código de Defesa do Consumidor (CDC) ou por outras normas obrigatórias."] },
    { h: "10. Encerramento", body: ["Você pode excluir sua conta quando quiser, pela página da conta. Podemos encerrar contas que descumpram estes Termos e, sempre que possível, explicamos o motivo."] },
    { h: "11. Lei e foro", body: ["Estes Termos seguem a lei brasileira. O consumidor pode propor ações no foro do seu domicílio. Antes de ir à Justiça, fala com a gente — a maioria dos problemas se resolve com uma mensagem."] },
    { h: "12. Mudanças nestes Termos", body: ["A data lá em cima é atualizada quando estes Termos mudam. Mudanças relevantes são avisadas no site antes de valer; continuar usando o serviço depois disso significa que você as aceita."] },
  ],
};

const es: LegalDoc = {
  title: "Términos de uso",
  summary: "Las reglas para usar ResumeTailor: qué hace el servicio, cómo funcionan los créditos y los pagos, qué puedes y qué no puedes hacer, y los límites de nuestra responsabilidad.",
  sections: [
    { h: "1. Aceptación", body: ["Al crear una cuenta o usar ResumeTailor aceptas estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses el servicio. El responsable del servicio está identificado al inicio de esta página."] },
    { h: "2. Qué hace el servicio", body: [
      "ResumeTailor usa inteligencia artificial para ayudarte a redactar el material de una postulación: un CV adaptado a una oferta, cartas de presentación, correos para reclutadores, textos de LinkedIn, preparación y práctica de entrevistas, además de herramientas gratuitas (test ATS, revisión de encaje, seguimiento de postulaciones).",
      "Todo lo que escribe la IA es un borrador. Léelo, corrígelo y decide qué enviar. El servicio no garantiza entrevistas, ofertas ni ningún resultado de contratación, y los puntajes (coincidencia, ATS, encaje, entrevista) son orientaciones, no predicciones.",
    ] },
    { h: "3. Tu cuenta", body: [{ list: [
      "Usa un correo real que controles; una cuenta por persona.",
      "No compartas tu contraseña. Eres responsable de lo que ocurra en tu cuenta; avísanos si sospechas un uso indebido y usa “Cerrar sesión en todos los dispositivos” en tu cuenta.",
      "El servicio está pensado para personas adultas; los menores de 18 años necesitan la participación de su madre, padre o tutor.",
    ] }] },
    { h: "4. Créditos y pagos", body: [{ list: [
      "Las vistas previas son gratis. Un crédito desbloquea un kit completo. Las cuentas nuevas reciben un crédito gratis; podemos no otorgarlo cuando la misma persona o conexión abre varias cuentas.",
      "Los créditos se venden en paquetes prepagados. El precio, la moneda y el medio de pago se muestran antes de pagar: Mercado Pago cobra en reales brasileños (BRL); Stripe cobra en dólares estadounidenses (USD). Tu banco puede convertir el importe y cobrar comisiones.",
      "No hay suscripción ni renovación automática: solo se te cobra cuando compras un paquete.",
      "Los créditos no caducan, no se pueden transferir y no tienen valor en dinero.",
      "Los créditos se acreditan cuando el medio de pago confirma el pago (Pix suele ser inmediato; el boleto puede tardar hasta 2 días hábiles).",
      "Si un pago se reembolsa o se desconoce (contracargo), sus créditos se retiran de tu saldo (los créditos ya usados no se pueden retirar).",
    ] }, "Los reembolsos y el derecho de desistimiento se describen en la Política de reembolsos."] },
    { h: "5. Uso aceptable", body: [
      "Te comprometes a no:",
      { list: [
        "usar el servicio para engañar a empleadores — por ejemplo, declarando experiencia, títulos o logros que no tienes (la IA está hecha para no inventarlos, y eres responsable de lo que envías);",
        "subir contenido ilícito, que infrinja derechos de terceros o que contenga datos personales de otras personas sin base legal;",
        "publicar un CV web haciéndote pasar por otra persona;",
        "acceder al servicio de forma automatizada, extraer datos, saltarte sus límites, revenderlo o intentar vulnerar su seguridad.",
      ] },
      "Podemos limitar, suspender o cerrar cuentas que incumplan estas reglas y desactivar CV web que las infrinjan.",
    ] },
    { h: "6. Tu contenido", body: [
      "Lo que escribes y lo que el servicio genera para ti es tuyo. Nos autorizas a guardarlo y tratarlo solo para prestar el servicio (incluido el envío a los encargados listados en la Política de privacidad). Publicar un CV web es tu decisión; puedes desactivarlo o borrarlo cuando quieras.",
    ] },
    { h: "7. Disponibilidad y cambios", body: ["Trabajamos para mantener el servicio disponible, pero puede interrumpirse por mantenimiento, fallos de proveedores o causas ajenas a nosotros — por ejemplo, cuando la IA del proveedor falla, la generación queda en pausa. Podemos cambiar o retirar funciones; los créditos ya pagados siguen sirviendo para las funciones que los usan, o se reembolsan si eso deja de ser posible."] },
    { h: "8. Propiedad intelectual", body: ["El nombre, el diseño y el software de ResumeTailor pertenecen a su responsable. Estos Términos no te transfieren ninguno de esos derechos más allá del uso del servicio."] },
    { h: "9. Responsabilidad", body: ["En la medida en que la ley lo permita, el servicio se ofrece tal como está y no respondemos por pérdidas indirectas ni por decisiones de los empleadores. Nada de estos Términos limita los derechos que tengas como consumidor según el Código de Defensa del Consumidor de Brasil (CDC) o las normas imperativas de tu país."] },
    { h: "10. Terminación", body: ["Puedes eliminar tu cuenta en cualquier momento desde la página de tu cuenta. Podemos cerrar cuentas que incumplan estos Términos y, cuando sea posible, te explicaremos el motivo."] },
    { h: "11. Ley aplicable y disputas", body: ["Estos Términos se rigen por la ley brasileña, sin perjuicio de las normas de protección al consumidor de tu país que sean obligatorias. Antes de acudir a los tribunales, escríbenos — la mayoría de los problemas se resuelven con un mensaje."] },
    { h: "12. Cambios en estos Términos", body: ["Actualizamos la fecha de arriba cuando estos Términos cambian. Los cambios importantes se anuncian en el sitio antes de entrar en vigor; seguir usando el servicio después implica aceptarlos."] },
  ],
};

export const terms: Record<LegalLang, LegalDoc> = { en, pt, es };
