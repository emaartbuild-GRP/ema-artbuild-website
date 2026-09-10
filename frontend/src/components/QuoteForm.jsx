import { useRef, useState } from "react";
import { LoaderCircle, Paperclip } from "lucide-react";

const projects = ["Design intérieur", "Conception 3D", "Construction", "Rénovation", "Aménagement", "Suivi de chantier", "Autre"];
const budgets = ["Moins de 100 000 MAD", "100 000 – 250 000 MAD", "250 000 – 500 000 MAD", "500 000 – 1 000 000 MAD", "Plus de 1 000 000 MAD", "À définir"];
const MAX_FILES = 3;
const MAX_TOTAL_SIZE = 4 * 1024 * 1024;

async function readJsonSafely(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (!body) return {};
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Le serveur a renvoyé une réponse inattendue (${response.status}) au lieu de JSON.`);
  }
  try { return JSON.parse(body); } catch { throw new Error("Le serveur a renvoyé un JSON invalide."); }
}

export default function QuoteForm({ t, locale }) {
  const formRef = useRef(null); const [status, setStatus] = useState("idle"); const [notice, setNotice] = useState(""); const [files, setFiles] = useState([]);
  const submit = async (event) => {
    event.preventDefault(); setStatus("loading"); setNotice("");
    try {
      if (files.length > MAX_FILES) throw new Error(`Vous pouvez joindre jusqu’à ${MAX_FILES} fichiers.`);
      if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) throw new Error("Les pièces jointes sont limitées à 4 Mo au total.");

      const submission = new FormData(formRef.current); submission.set("locale", locale);
      files.forEach((file, index) => submission.append(`attachment_${index + 1}`, file));
      const captureResponse = await fetch("/__forms.html", { method: "POST", body: submission });
      if (!captureResponse.ok) throw new Error(`La demande n’a pas pu être enregistrée (${captureResponse.status}).`);

      const notification = new FormData(formRef.current); notification.set("locale", locale); files.forEach((file) => notification.append("attachments", file));
      fetch("/api/quote-requests", { method: "POST", body: notification }).then(async (response) => {
        if (!response.ok) await readJsonSafely(response);
      }).catch(() => {});

      setStatus("success"); setNotice("Merci, votre demande a bien été envoyée."); formRef.current.reset(); setFiles([]);
    } catch (error) { setStatus("error"); setNotice(error instanceof Error ? error.message : "Une erreur est survenue."); }
  };
  return <form ref={formRef} className="quote-form" name="quote-request" method="POST" data-netlify="true" netlify-honeypot="bot-field" onSubmit={submit} data-testid="quote-request-form">
    <input type="hidden" name="form-name" value="quote-request" />
    <input type="hidden" name="locale" value={locale} />
    <p hidden><label>Ne pas remplir ce champ : <input name="bot-field" /></label></p>
    <div className="form-grid">
      <label data-testid="full-name-label">Nom & prénom<input name="full_name" data-testid="full-name-input" required autoComplete="name" /></label>
      <label data-testid="phone-label">Téléphone<input name="phone" data-testid="phone-input" required type="tel" autoComplete="tel" /></label>
      <label data-testid="email-label">Email<input name="email" data-testid="email-input" required type="email" autoComplete="email" /></label>
      <label data-testid="city-label">Ville<input name="city" data-testid="city-input" required autoComplete="address-level2" /></label>
      <label data-testid="project-type-label">Type de projet<select name="project_type" data-testid="project-type-select" required defaultValue=""><option value="" disabled>Sélectionner</option>{projects.map(x => <option key={x}>{x}</option>)}</select></label>
      <label data-testid="budget-label">Budget estimatif<select name="budget" data-testid="budget-select" defaultValue="À définir">{budgets.map(x => <option key={x}>{x}</option>)}</select></label>
      <label className="form-message" data-testid="message-label">Message / Description du projet<textarea name="message" data-testid="message-textarea" required rows="5" /></label>
    </div>
    <div className="file-row">
      <label className="upload-control" data-testid="attachment-label"><Paperclip size={16} /> Ajouter des photos ou des plans<input data-testid="attachment-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} /></label>
      <span data-testid="attachment-files-status">{files.length ? `${files.length} fichier(s) sélectionné(s)` : `JPG, PNG, WEBP ou PDF · ${MAX_FILES} fichiers · 4 Mo maximum`}</span>
    </div>
    <button className="button button-dark form-submit" data-testid="quote-submit-button" disabled={status === "loading"} type="submit">{status === "loading" ? <><LoaderCircle className="spin" size={16} /> Envoi en cours</> : t.submit}<span>↗</span></button>
    {notice && <p role="alert" className={`form-notice ${status}`} data-testid="quote-form-notice">{notice}</p>}
  </form>;
}
