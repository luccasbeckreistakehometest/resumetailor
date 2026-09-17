import type { LegalDoc, LegalLang } from "./types";

const en: LegalDoc = {
  title: "Refund Policy",
  summary: "Your 7-day right of withdrawal, what happens to the credits, and how to ask for a refund.",
  sections: [
    { h: "1. Seven days to change your mind", body: [
      "Credit packs are bought online, so you have the right of withdrawal set by article 49 of the Brazilian Consumer Defense Code (CDC): within 7 days of the purchase you can cancel it and get your money back.",
      { list: [
        "If you haven't used any credit from that pack, the refund is the full amount paid.",
        "If you used some of them, we refund the credits you didn't use, at that pack's price per credit (a credit already used has delivered its kit).",
      ] },
    ] },
    { h: "2. After 7 days", body: [
      "Credits don't expire, so there is no need to rush. After the 7 days we still refund or return credits when something went wrong on our side — for example, a charge without credits, a duplicate charge, or a kit the service could not deliver.",
    ] },
    { h: "3. How to ask", body: [{ list: [
      "Use the contact form with the topic “A payment or credits” (or the e-mail in the “Who runs ResumeTailor” box on this page).",
      "Tell us the e-mail of your account and the date and amount of the payment.",
      "The refund goes back through the same payment method, via Mercado Pago or Stripe. Pix refunds are usually quick; card refunds appear on your statement according to your bank's schedule (often one or two billing cycles).",
    ] }] },
    { h: "4. What happens to the credits", body: ["When a payment is refunded, the credits from it are removed from your balance. The same happens after a chargeback; accounts involved in abusive chargebacks may be suspended."] },
    { h: "5. Free credits", body: ["The free credit you get when you create an account, and credits from promo codes or referrals, have no monetary value and are not refundable. If the purchase that earned referral credits is refunded or charged back, those credits are removed from both accounts (as far as they haven't been used)."] },
  ],
};

const pt: LegalDoc = {
  title: "Política de Reembolso",
  summary: "Seu direito de arrependimento de 7 dias, o que acontece com os créditos e como pedir o reembolso.",
  sections: [
    { h: "1. Sete dias pra desistir", body: [
      "Os pacotes de créditos são comprados pela internet, então vale o direito de arrependimento do art. 49 do Código de Defesa do Consumidor (CDC): em até 7 dias depois da compra você pode desistir e receber o dinheiro de volta.",
      { list: [
        "Se você não usou nenhum crédito do pacote, o reembolso é do valor total pago.",
        "Se usou parte deles, a gente reembolsa os créditos não usados, pelo valor por crédito daquele pacote (um crédito usado já entregou o kit dele).",
      ] },
    ] },
    { h: "2. Depois dos 7 dias", body: [
      "Os créditos não vencem, então não precisa ter pressa. Depois dos 7 dias a gente continua devolvendo o dinheiro ou os créditos quando o problema foi do nosso lado — por exemplo, cobrança sem crédito, cobrança em dobro ou um kit que o serviço não conseguiu entregar.",
    ] },
    { h: "3. Como pedir", body: [{ list: [
      "Use o formulário de contato com o assunto “Pagamento ou créditos” (ou o e-mail do quadro “Quem opera o ResumeTailor”, nesta página).",
      "Informe o e-mail da sua conta e a data e o valor do pagamento.",
      "O reembolso volta pelo mesmo meio de pagamento, via Mercado Pago ou Stripe. Estorno de Pix costuma ser rápido; no cartão, aparece na fatura conforme o calendário do seu banco (muitas vezes em uma ou duas faturas).",
    ] }] },
    { h: "4. O que acontece com os créditos", body: ["Quando um pagamento é reembolsado, os créditos dele saem do seu saldo. O mesmo vale para contestações (chargeback); contas envolvidas em contestações abusivas podem ser suspensas."] },
    { h: "5. Créditos grátis", body: ["O crédito grátis que você ganha ao criar a conta e os créditos de códigos promocionais ou de indicação não têm valor em dinheiro e não são reembolsáveis. Se a compra que gerou os créditos de indicação for reembolsada ou contestada, esses créditos saem das duas contas (até onde ainda não foram usados)."] },
  ],
};

const es: LegalDoc = {
  title: "Política de reembolsos",
  summary: "Tu derecho de desistimiento de 7 días, qué pasa con los créditos y cómo pedir un reembolso.",
  sections: [
    { h: "1. Siete días para arrepentirte", body: [
      "Los paquetes de créditos se compran por internet, así que tienes el derecho de desistimiento del art. 49 del Código de Defensa del Consumidor de Brasil (CDC): dentro de los 7 días posteriores a la compra puedes cancelarla y recuperar tu dinero. Si la ley de tu país te da un plazo mayor, se aplica ese plazo.",
      { list: [
        "Si no usaste ningún crédito del paquete, reembolsamos el importe total pagado.",
        "Si usaste algunos, reembolsamos los créditos no usados, al precio por crédito de ese paquete (un crédito usado ya entregó su kit).",
      ] },
    ] },
    { h: "2. Después de los 7 días", body: [
      "Los créditos no caducan, así que no hay prisa. Pasados los 7 días seguimos devolviendo el dinero o los créditos cuando el problema fue nuestro — por ejemplo, un cobro sin créditos, un cobro duplicado o un kit que el servicio no pudo entregar.",
    ] },
    { h: "3. Cómo pedirlo", body: [{ list: [
      "Usa el formulario de contacto con el tema “Un pago o créditos” (o el correo del recuadro “Quién opera ResumeTailor” de esta página).",
      "Indica el correo de tu cuenta y la fecha y el importe del pago.",
      "El reembolso vuelve por el mismo medio de pago, vía Mercado Pago o Stripe. Los reembolsos por Pix suelen ser rápidos; en tarjeta aparecen en tu resumen según los plazos de tu banco (a menudo uno o dos ciclos de facturación).",
    ] }] },
    { h: "4. Qué pasa con los créditos", body: ["Cuando se reembolsa un pago, sus créditos se retiran de tu saldo. Lo mismo ocurre tras un contracargo; las cuentas con contracargos abusivos pueden ser suspendidas."] },
    { h: "5. Créditos gratuitos", body: ["El crédito gratuito que recibes al crear la cuenta y los créditos de códigos promocionales o de referidos no tienen valor monetario y no son reembolsables. Si la compra que generó los créditos de referido se reembolsa o tiene un contracargo, esos créditos se retiran de ambas cuentas (en la medida en que no se hayan usado)."] },
  ],
};

export const refunds: Record<LegalLang, LegalDoc> = { en, pt, es };
