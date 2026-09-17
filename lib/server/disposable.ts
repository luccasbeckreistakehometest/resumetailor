/**
 * Throwaway-mail domains. Signups from them are refused: the free first kit is worth a real
 * credit, and these addresses exist to farm exactly that. Not exhaustive by design — the per-IP
 * signup-bonus cap is the second line.
 */
const DOMAINS = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonaddy.me", "burnermail.io",
  "byom.de", "discard.email", "discardmail.com", "dispostable.com", "dropmail.me", "emailondeck.com",
  "emailfake.com", "emailtemporanea.com", "emailtemporanea.net", "fakeinbox.com", "fakemail.net", "fakemailgenerator.com",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com", "inboxbear.com", "inboxkitten.com",
  "incognitomail.org", "jetable.org", "kasmail.com", "linshiyouxiang.net", "mail-temp.com", "mail.tm", "mail7.io",
  "mailcatch.com", "maildrop.cc", "mailinator.com", "mailinator.net", "mailinator2.com", "mailnesia.com", "mailpoof.com",
  "mailsac.com", "mailtemp.net", "mintemail.com", "moakt.com", "mohmal.com", "mytemp.email", "nada.email",
  "sharklasers.com", "grr.la", "guerrillamail.xyz", "pokemail.net", "spam4.me", "spambog.com", "spamgourmet.com",
  "spamex.com", "tempail.com", "tempinbox.com", "tempm.com", "tempmail.com", "tempmail.dev", "tempmail.net",
  "tempmail.plus", "tempmailo.com", "temp-mail.io", "temp-mail.org", "tempr.email", "throwawaymail.com", "trashmail.com",
  "trashmail.de", "trashmail.net", "trashmail.ws", "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf",
  "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf", "moncourrier.fr.nf",
  "monemail.fr.nf", "monmail.fr.nf", "wegwerfmail.de", "wegwerfmail.net", "einrot.com", "fleckens.hu", "cuvox.de",
  "dayrep.com", "gustr.com", "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us", "armyspy.com",
  "tmpmail.org", "tmpmail.net", "tmail.ws", "luxusmail.org", "emailnax.com", "tempemail.co", "fexbox.org",
  "mailbox.in.ua", "vomoto.com", "zetmail.com", "emltmp.com", "spymail.one", "tmpeml.com", "correotemporal.org",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return false;
  if (DOMAINS.has(domain)) return true;
  // subdomains of the same services (x.mailinator.com)
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) if (DOMAINS.has(parts.slice(i).join("."))) return true;
  return false;
}
