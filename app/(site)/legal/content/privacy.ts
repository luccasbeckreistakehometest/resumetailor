import type { LegalDoc, LegalLang } from "./types";

const en: LegalDoc = {
  title: "Privacy Policy",
  summary: "What ResumeTailor collects, why, who helps us process it, how long we keep it, and how you exercise your rights under Brazil's LGPD (Lei 13.709/2018) and similar laws.",
  sections: [
    { h: "1. Who is responsible", body: [
      "The controller of your personal data is the operator of ResumeTailor named in the “Who runs ResumeTailor” box on this page (name, tax ID, address and e-mail). For anything about your data, write to us through the contact form (topic “My data”) or to the e-mail in that box.",
    ] },
    { h: "2. What we collect", body: [{ list: [
      "Account: e-mail, name (optional), password (stored only as a salted scrypt hash), preferred language, and the date you accepted these terms.",
      "What you give us to build a kit: résumé text, job postings, the answers you type or say (as text), your target role and profile details.",
      "What the service produces for you: tailored résumés, cover letters, e-mails, LinkedIn texts, interview questions, your answers, scores and summaries, and the public web résumé if you publish one.",
      "Voice: speech is turned into text by your browser's own speech recognition (in Chrome, for example, that is a Google service). We receive only the text, never your audio.",
      "Payments: the pack, amount, currency, status and the payment provider's reference. Card, Pix and bank details are handled by Stripe or Mercado Pago and never reach us.",
      "Application tracker: the companies, roles, links, notes and dates you enter.",
      "Saved profile: the base résumé and the facts you gave us (spoken details, the numbers you answered), kept so the next kit starts from them. You can change or remove it at any time in your library.",
      "Technical data: IP address (for security, abuse prevention and rate limits — never stored with the statistics below), cookies and browser storage (see the Cookie Notice), and events from your first sessions (for example “made a kit”, “started the tour”).",
      "Our own visit statistics: pages opened, the campaign tags (UTM) and referring site of your first visit, language, phone or computer, and steps such as “made a preview”, “created an account” or “bought credits”, linked to a random visitor ID and, once you sign up, to your account. No third-party analytics.",
      "Contact messages: what you write to us and the e-mail you give.",
    ] }, "Files you import (PDF, Word) are read inside your browser and are not uploaded. The free ATS check also runs entirely in your browser. The “Am I a fit?” check keeps only the verdict and a fingerprint of the texts, not the texts themselves."] },
    { h: "3. Why we use it, and on what legal basis", body: [{ list: [
      "To provide the service you asked for — generating and storing your kits, interviews and tracker (performance of a contract, LGPD art. 7, V).",
      "To process payments, prevent fraud and keep accounting records (legal obligation and contract, art. 7, II and V).",
      "To keep the service secure and affordable — rate limits, abuse and spam prevention, cost control (legitimate interest, art. 7, IX).",
      "To answer you when you contact us (contract and legitimate interest).",
      "To understand how the product is used, which pages and campaigns work, and to improve it, using first-session events and our own visit statistics (legitimate interest). Browsers that send Global Privacy Control or Do Not Track are left out of the statistics. We do not sell data, show ads or build advertising profiles.",
      "To publish your web résumé, only when you switch it on (your choice, which you can undo at any time).",
    ] }] },
    { h: "4. Who helps us (processors)", body: [
      "We share data only with the providers needed to run the service, each for its own task:",
      { list: [
        "Anthropic (United States) — the AI that writes your kits and scores your interview answers. Under Anthropic's commercial terms, content sent through its API is not used to train its models.",
        "Mercado Pago and Stripe — payment processing. They act under their own privacy policies for the payment data you give them.",
        "ElevenLabs or OpenAI (United States) — the AI voice that reads the app's questions aloud, when voice is enabled. They receive the text being read, which can include details you mentioned.",
        "Tavily — web search for company insights, when that feature is enabled. It receives the company name taken from the posting.",
        "Hostinger — the servers where the service and its database run.",
        "Meta (WhatsApp) — only if you choose to contact us or share your web résumé through WhatsApp; WhatsApp's own policy applies there.",
      ] },
      "If you publish a web résumé, anyone with the link can see it (unless you set a PIN), and search engines only index it if you allow that.",
      "We may also disclose data when required by law or by a competent authority.",
    ] },
    { h: "5. International transfers", body: [
      "Several of these providers process data outside Brazil, mainly in the United States. These transfers follow LGPD art. 33, relying on the contractual guarantees in each provider's terms, and we choose providers that commit to security and confidentiality.",
    ] },
    { h: "6. How long we keep it", body: [{ list: [
      "Account, kits, interviews, tracker and voice transcripts: while your account exists. When you delete your account they are erased from the live database right away, together with the messages you sent us from that e-mail; AI cost records stay, with nothing that points to you; backup copies, where they exist, are overwritten as backups rotate.",
      "Payment records: kept for as long as tax and accounting law requires, without your name or e-mail once your account is deleted.",
      "Previews made without an account are tied to a random cookie in your browser; ask us through the contact form to delete them.",
      "Security records such as rate-limit counters expire within hours or days; records of AI usage and errors are kept only as long as needed for security and cost control.",
      "Visit statistics: raw events are deleted after 180 days. The record of your first visit is deleted after 180 days too if you never create an account, or kept while your account exists; deleting the account removes it and unlinks your events from you.",
      "Contact messages: as long as needed to handle your request.",
    ] }] },
    { h: "7. Your rights and how to use them", body: [
      "Under LGPD art. 18 you can ask for: confirmation that we process your data; access to it; correction; anonymisation, blocking or deletion of unnecessary data; portability; information about who we share it with; information about refusing consent and its consequences; and withdrawal of consent. You can also object to processing based on legitimate interest.",
      { list: [
        "In your account page: download all your data (JSON), change your password, sign out of every device, and delete your account.",
        "For anything else: the contact form, topic “My data”. We answer within the legal deadlines.",
        "You can also complain to Brazil's data protection authority (ANPD) at gov.br/anpd.",
      ] },
    ] },
    { h: "8. Cookies", body: ["We use only first-party cookies and browser storage: what the service needs to work (sign-in, your anonymous previews, a verified PIN, your language, a friend's referral code) and the random visitor ID behind our own visit statistics. No advertising cookies and no third-party analytics. Details are in the Cookie Notice."] },
    { h: "9. Security", body: ["Connections use HTTPS, passwords are stored only as salted hashes, sessions can be revoked, and access to the admin panel is restricted. No system is perfectly secure; if an incident puts your data at risk, we will tell you and the authorities as the law requires."] },
    { h: "10. Children and teenagers", body: ["ResumeTailor is meant for adults. People under 18 should use it with the involvement of a parent or guardian."] },
    { h: "11. Changes", body: ["When this policy changes we update the date at the top. If a change affects how we use your data in a significant way, we will announce it on the site before it takes effect."] },
  ],
};

const pt: LegalDoc = {
  title: "Política de Privacidade",
  summary: "O que o ResumeTailor coleta, pra quê, quem ajuda a gente a tratar esses dados, por quanto tempo eles ficam guardados e como você exerce seus direitos pela LGPD (Lei 13.709/2018).",
  sections: [
    { h: "1. Quem é o responsável", body: [
      "O controlador dos seus dados pessoais é o responsável pelo ResumeTailor indicado no quadro “Quem opera o ResumeTailor”, nesta página (nome, CPF/CNPJ, endereço e e-mail). Pra qualquer assunto sobre seus dados, fala com a gente pelo formulário de contato (assunto “Meus dados”) ou pelo e-mail desse quadro.",
    ] },
    { h: "2. O que a gente coleta", body: [{ list: [
      "Conta: e-mail, nome (opcional), senha (guardada só como hash scrypt com sal), idioma preferido e a data em que você aceitou estes termos.",
      "O que você passa pra montar um kit: texto do currículo, vagas, respostas que você digita ou fala (em texto), cargo desejado e detalhes do seu perfil.",
      "O que o serviço produz pra você: currículos ajustados, cartas, e-mails, textos de LinkedIn, perguntas de entrevista, suas respostas, notas e resumos, e o currículo publicado na web, se você publicar.",
      "Voz: a fala vira texto pelo reconhecimento de voz do seu próprio navegador (no Chrome, por exemplo, é um serviço do Google). A gente recebe só o texto, nunca o áudio.",
      "Pagamentos: o pacote, o valor, a moeda, a situação e a referência do provedor. Dados de cartão, Pix e conta bancária ficam com o Stripe ou o Mercado Pago e nunca chegam até nós.",
      "Controle de candidaturas: empresas, cargos, links, anotações e datas que você cadastra.",
      "Perfil salvo: o currículo base e os fatos que você contou (detalhes falados, os números que você respondeu), guardados pra que o próximo kit já comece deles. Você pode trocar ou apagar quando quiser, na sua biblioteca.",
      "Dados técnicos: endereço IP (pra segurança, prevenção de abuso e limites de uso — nunca guardado junto com a estatística abaixo), cookies e armazenamento do navegador (veja o Aviso de Cookies) e eventos das suas primeiras sessões (por exemplo “gerou um kit”, “começou o tour”).",
      "Nossa própria estatística de visitas: páginas abertas, as etiquetas de campanha (UTM) e o site de origem da primeira visita, idioma, celular ou computador, e etapas como “fez uma prévia”, “criou a conta” ou “comprou créditos”, ligadas a um identificador aleatório de visitante e, depois do cadastro, à sua conta. Sem analytics de terceiros.",
      "Mensagens de contato: o que você escreve e o e-mail que você informa.",
    ] }, "Arquivos importados (PDF, Word) são lidos dentro do seu navegador e não são enviados. O teste de ATS grátis também roda inteiro no navegador. O “Sou um fit?” guarda só o resultado e uma impressão digital dos textos, não os textos."] },
    { h: "3. Pra que a gente usa, e com qual base legal", body: [{ list: [
      "Prestar o serviço que você pediu — gerar e guardar seus kits, entrevistas e candidaturas (execução de contrato, art. 7º, V, da LGPD).",
      "Processar pagamentos, prevenir fraude e manter registros contábeis (cumprimento de obrigação legal e execução de contrato, art. 7º, II e V).",
      "Manter o serviço seguro e viável — limites de uso, prevenção de abuso e spam, controle de custos (legítimo interesse, art. 7º, IX).",
      "Te responder quando você entra em contato (execução de contrato e legítimo interesse).",
      "Entender como o produto é usado, quais páginas e campanhas funcionam, e melhorá-lo, com os eventos das primeiras sessões e a nossa própria estatística de visitas (legítimo interesse). Navegadores que enviam Global Privacy Control ou Do Not Track ficam fora da estatística. A gente não vende dados, não mostra anúncios e não monta perfil publicitário.",
      "Publicar seu currículo na web, só quando você liga essa opção (escolha sua, que pode ser desfeita a qualquer momento).",
    ] }] },
    { h: "4. Quem ajuda a gente (operadores)", body: [
      "Os dados só são compartilhados com os fornecedores necessários pra rodar o serviço, cada um na sua função:",
      { list: [
        "Anthropic (Estados Unidos) — a IA que escreve seus kits e avalia suas respostas de entrevista. Pelos termos comerciais da Anthropic, o conteúdo enviado pela API dela não é usado pra treinar os modelos.",
        "Mercado Pago e Stripe — processamento de pagamentos. Eles seguem as próprias políticas de privacidade para os dados de pagamento que você informa a eles.",
        "ElevenLabs ou OpenAI (Estados Unidos) — a voz de IA que lê as perguntas do app em voz alta, quando a voz está ligada. Recebem o texto lido, que pode incluir detalhes que você contou.",
        "Tavily — busca na web para os insights da empresa, quando esse recurso está ativo. Recebe o nome da empresa tirado da vaga.",
        "Hostinger — os servidores onde o serviço e o banco de dados rodam.",
        "Meta (WhatsApp) — só se você escolher falar com a gente ou compartilhar seu currículo pelo WhatsApp; ali vale a política do próprio WhatsApp.",
      ] },
      "Se você publicar um currículo na web, qualquer pessoa com o link consegue ver (a não ser que você coloque um PIN), e os buscadores só indexam se você permitir.",
      "A gente também pode informar dados quando a lei ou uma autoridade competente exigir.",
    ] },
    { h: "5. Transferência internacional", body: [
      "Vários desses fornecedores tratam dados fora do Brasil, principalmente nos Estados Unidos. Essas transferências seguem o art. 33 da LGPD, com base nas garantias contratuais dos termos de cada fornecedor, e a gente escolhe fornecedores comprometidos com segurança e confidencialidade.",
    ] },
    { h: "6. Por quanto tempo a gente guarda", body: [{ list: [
      "Conta, kits, entrevistas, candidaturas e transcrições de voz: enquanto sua conta existir. Quando você exclui a conta, esses dados saem do banco na hora, junto com as mensagens que você mandou pra gente com esse e-mail; os registros de custo da IA ficam, mas sem nada que aponte pra você; cópias de backup, quando existem, são sobrescritas conforme os backups giram.",
      "Registros de pagamento: pelo prazo que a legislação fiscal e contábil exige, sem seu nome nem e-mail depois que a conta é excluída.",
      "Prévias feitas sem conta ficam ligadas a um cookie aleatório no seu navegador; peça pelo formulário de contato se quiser que sejam apagadas.",
      "Registros de segurança, como contadores de limite de uso, expiram em horas ou dias; registros de uso e de erros da IA ficam só pelo tempo necessário pra segurança e controle de custos.",
      "Estatística de visitas: os eventos brutos são apagados depois de 180 dias. O registro da sua primeira visita também é apagado depois de 180 dias se você nunca criar conta, ou fica enquanto a conta existir; ao excluir a conta, ele é apagado e os seus eventos deixam de estar ligados a você.",
      "Mensagens de contato: pelo tempo necessário pra resolver seu pedido.",
    ] }] },
    { h: "7. Seus direitos e como exercer", body: [
      "Pelo art. 18 da LGPD você pode pedir: confirmação de que tratamos seus dados; acesso a eles; correção; anonimização, bloqueio ou eliminação do que for desnecessário; portabilidade; informação sobre com quem compartilhamos; informação sobre a possibilidade de não consentir e as consequências; e revogação do consentimento. Você também pode se opor a tratamentos feitos com base em legítimo interesse.",
      { list: [
        "Na página da sua conta: baixar todos os seus dados (JSON), trocar a senha, sair de todos os dispositivos e excluir a conta.",
        "Pra todo o resto: o formulário de contato, assunto “Meus dados”. Respondemos dentro dos prazos da lei.",
        "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em gov.br/anpd.",
      ] },
    ] },
    { h: "8. Cookies", body: ["Usamos só cookies e armazenamento do navegador próprios: o que o serviço precisa pra funcionar (login, suas prévias anônimas, um PIN já verificado, seu idioma, o código de indicação de um amigo) e o identificador aleatório de visitante da nossa estatística de visitas. Nada de cookies de publicidade nem de analytics de terceiros. Os detalhes estão no Aviso de Cookies."] },
    { h: "9. Segurança", body: ["As conexões usam HTTPS, as senhas ficam guardadas só como hash com sal, as sessões podem ser revogadas e o acesso ao painel administrativo é restrito. Nenhum sistema é 100% seguro; se um incidente colocar seus dados em risco, a gente avisa você e as autoridades, como a lei manda."] },
    { h: "10. Crianças e adolescentes", body: ["O ResumeTailor é pensado pra adultos. Menores de 18 anos devem usar com o acompanhamento de pai, mãe ou responsável."] },
    { h: "11. Mudanças", body: ["Quando esta política mudar, a data lá em cima é atualizada. Se a mudança afetar de forma relevante o uso dos seus dados, a gente avisa no site antes de ela valer."] },
  ],
};

const es: LegalDoc = {
  title: "Política de privacidad",
  summary: "Qué recoge ResumeTailor, para qué, quién nos ayuda a tratarlo, cuánto tiempo lo guardamos y cómo ejerces tus derechos según la LGPD de Brasil (Ley 13.709/2018) y normas similares de tu país.",
  sections: [
    { h: "1. Quién es el responsable", body: [
      "El responsable del tratamiento de tus datos personales es el operador de ResumeTailor indicado en el recuadro “Quién opera ResumeTailor” de esta página (nombre, identificación fiscal, dirección y correo). Para cualquier asunto sobre tus datos, escríbenos por el formulario de contacto (tema “Mis datos”) o al correo de ese recuadro.",
    ] },
    { h: "2. Qué recogemos", body: [{ list: [
      "Cuenta: correo, nombre (opcional), contraseña (guardada solo como hash scrypt con sal), idioma preferido y la fecha en que aceptaste estos términos.",
      "Lo que nos das para crear un kit: el texto de tu CV, ofertas de empleo, las respuestas que escribes o dices (como texto), el puesto que buscas y datos de tu perfil.",
      "Lo que el servicio produce para ti: CV adaptados, cartas, correos, textos de LinkedIn, preguntas de entrevista, tus respuestas, puntajes y resúmenes, y el CV web si decides publicarlo.",
      "Voz: el reconocimiento de voz de tu propio navegador convierte lo que dices en texto (en Chrome, por ejemplo, es un servicio de Google). Recibimos solo el texto, nunca el audio.",
      "Pagos: el paquete, el importe, la moneda, el estado y la referencia del proveedor. Los datos de tarjeta, Pix o cuenta bancaria los gestionan Stripe o Mercado Pago y nunca llegan a nosotros.",
      "Seguimiento de postulaciones: las empresas, puestos, enlaces, notas y fechas que registras.",
      "Perfil guardado: el CV base y los datos que nos diste (detalles dichos en voz alta, las cifras que respondiste), guardados para que el próximo kit empiece desde ahí. Puedes cambiarlo o borrarlo cuando quieras en tu biblioteca.",
      "Datos técnicos: dirección IP (para seguridad, prevención de abusos y límites de uso — nunca se guarda con la estadística de abajo), cookies y almacenamiento del navegador (ver el Aviso de cookies) y eventos de tus primeras sesiones (por ejemplo “creó un kit”, “empezó el recorrido”).",
      "Nuestra propia estadística de visitas: páginas abiertas, las etiquetas de campaña (UTM) y el sitio de origen de la primera visita, idioma, móvil o computadora, y pasos como “hizo una vista previa”, “creó la cuenta” o “compró créditos”, asociados a un identificador aleatorio de visitante y, tras el registro, a tu cuenta. Sin analítica de terceros.",
      "Mensajes de contacto: lo que nos escribes y el correo que indicas.",
    ] }, "Los archivos que importas (PDF, Word) se leen dentro de tu navegador y no se suben. La revisión ATS gratuita también funciona entera en tu navegador. La revisión “¿Encajo?” guarda solo el resultado y una huella de los textos, no los textos."] },
    { h: "3. Para qué lo usamos y con qué base legal", body: [{ list: [
      "Prestar el servicio que pediste — generar y guardar tus kits, entrevistas y postulaciones (ejecución de contrato, art. 7, V de la LGPD).",
      "Procesar pagos, prevenir fraudes y llevar registros contables (obligación legal y contrato, art. 7, II y V).",
      "Mantener el servicio seguro y sostenible — límites de uso, prevención de abusos y spam, control de costos (interés legítimo, art. 7, IX).",
      "Responderte cuando nos escribes (contrato e interés legítimo).",
      "Entender cómo se usa el producto, qué páginas y campañas funcionan, y mejorarlo, con los eventos de las primeras sesiones y nuestra propia estadística de visitas (interés legítimo). Los navegadores que envían Global Privacy Control o Do Not Track quedan fuera de la estadística. No vendemos datos, no mostramos anuncios ni creamos perfiles publicitarios.",
      "Publicar tu CV web, solo cuando tú lo activas (decisión tuya, que puedes deshacer en cualquier momento).",
    ] }] },
    { h: "4. Quién nos ayuda (encargados)", body: [
      "Compartimos datos solo con los proveedores necesarios para operar el servicio, cada uno para su tarea:",
      { list: [
        "Anthropic (Estados Unidos) — la IA que redacta tus kits y evalúa tus respuestas de entrevista. Según sus términos comerciales, el contenido enviado por su API no se usa para entrenar sus modelos.",
        "Mercado Pago y Stripe — procesamiento de pagos. Aplican sus propias políticas de privacidad a los datos de pago que les das.",
        "ElevenLabs u OpenAI (Estados Unidos) — la voz de IA que lee en voz alta las preguntas de la app, cuando la voz está activada. Reciben el texto que se lee, que puede incluir detalles que mencionaste.",
        "Tavily — búsqueda web para la información de la empresa, cuando esa función está activa. Recibe el nombre de la empresa tomado de la oferta.",
        "Hostinger — los servidores donde funcionan el servicio y su base de datos.",
        "Meta (WhatsApp) — solo si decides escribirnos o compartir tu CV web por WhatsApp; ahí se aplica la política de WhatsApp.",
      ] },
      "Si publicas un CV web, cualquiera con el enlace puede verlo (salvo que pongas un PIN), y los buscadores solo lo indexan si lo permites.",
      "También podemos revelar datos cuando lo exija la ley o una autoridad competente.",
    ] },
    { h: "5. Transferencias internacionales", body: [
      "Varios de estos proveedores tratan datos fuera de Brasil, sobre todo en Estados Unidos. Estas transferencias siguen el art. 33 de la LGPD, con base en las garantías contractuales de los términos de cada proveedor, y elegimos proveedores comprometidos con la seguridad y la confidencialidad.",
    ] },
    { h: "6. Cuánto tiempo lo guardamos", body: [{ list: [
      "Cuenta, kits, entrevistas, postulaciones y transcripciones de voz: mientras exista tu cuenta. Al eliminarla, se borran de inmediato de la base de datos, junto con los mensajes que nos enviaste desde ese correo; los registros de costo de la IA se conservan sin nada que te identifique; las copias de seguridad, si existen, se sobrescriben a medida que rotan.",
      "Registros de pago: durante el plazo que exige la normativa fiscal y contable, sin tu nombre ni tu correo una vez eliminada la cuenta.",
      "Las vistas previas creadas sin cuenta quedan asociadas a una cookie aleatoria de tu navegador; pídenos por el formulario de contacto que las borremos.",
      "Los registros de seguridad, como los contadores de límites de uso, caducan en horas o días; los registros de uso y errores de la IA se guardan solo el tiempo necesario para la seguridad y el control de costos.",
      "Estadística de visitas: los eventos brutos se borran a los 180 días. El registro de tu primera visita también se borra a los 180 días si nunca creas una cuenta, o se conserva mientras exista tu cuenta; al eliminarla, se borra y tus eventos dejan de estar asociados a ti.",
      "Mensajes de contacto: el tiempo necesario para atender tu solicitud.",
    ] }] },
    { h: "7. Tus derechos y cómo ejercerlos", body: [
      "Según el art. 18 de la LGPD puedes pedir: confirmación de que tratamos tus datos; acceso; corrección; anonimización, bloqueo o eliminación de los datos innecesarios; portabilidad; información sobre con quién los compartimos; información sobre la posibilidad de no dar tu consentimiento y sus consecuencias; y revocación del consentimiento. También puedes oponerte a los tratamientos basados en el interés legítimo.",
      { list: [
        "En la página de tu cuenta: descargar todos tus datos (JSON), cambiar la contraseña, cerrar sesión en todos los dispositivos y eliminar tu cuenta.",
        "Para todo lo demás: el formulario de contacto, tema “Mis datos”. Respondemos dentro de los plazos legales.",
        "También puedes reclamar ante la autoridad de protección de datos de Brasil (ANPD), en gov.br/anpd, o ante la autoridad de tu país.",
      ] },
    ] },
    { h: "8. Cookies", body: ["Usamos solo cookies y almacenamiento del navegador propios: lo que el servicio necesita para funcionar (inicio de sesión, tus vistas previas anónimas, un PIN ya verificado, tu idioma, el código de referido de un amigo) y el identificador aleatorio de visitante de nuestra estadística de visitas. Sin cookies publicitarias ni analítica de terceros. Los detalles están en el Aviso de cookies."] },
    { h: "9. Seguridad", body: ["Las conexiones usan HTTPS, las contraseñas se guardan solo como hash con sal, las sesiones se pueden revocar y el acceso al panel de administración está restringido. Ningún sistema es totalmente seguro; si un incidente pone en riesgo tus datos, te lo comunicaremos a ti y a las autoridades como exige la ley."] },
    { h: "10. Menores de edad", body: ["ResumeTailor está pensado para personas adultas. Los menores de 18 años deben usarlo con la participación de su madre, padre o tutor."] },
    { h: "11. Cambios", body: ["Cuando esta política cambie, actualizaremos la fecha de arriba. Si un cambio afecta de forma importante el uso de tus datos, lo anunciaremos en el sitio antes de que entre en vigor."] },
  ],
};

export const privacy: Record<LegalLang, LegalDoc> = { en, pt, es };
