"use strict";

const token = location.hash.slice(1);
const form = document.querySelector("#intake");
const status = document.querySelector("#status");
const fields = document.querySelector("#dreams");
const count = document.querySelector("#count");
const tone = document.querySelector("#tone");
const accent = document.querySelector("#accent");
const phrase = document.querySelector("#phrase");
const error = document.querySelector("#error");
const submit = form.querySelector("button");
const endpoint = document.querySelector('meta[name="intake-endpoint"]').content;
const examples = {
  realista: { labels: ["En camino", "Tiempo para mí", "Mi lugar"], phrase: "Un paso a la vez" },
  divertido: { labels: ["Planazo", "Modo aventura", "Hoy toca jugar"], phrase: "Que nunca falten las ganas de jugar" },
  mistico: { labels: ["Luz interior", "Luna nueva", "Raíces y alas"], phrase: "Honro el ritmo de mis ciclos" },
  inspirador: { labels: ["Me atrevo", "Puedo empezar", "Abro camino"], phrase: "Hago sitio a lo que importa" },
};

function dreamField(number) {
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = "Sueño " + number;
  fieldset.append(legend);
  const descriptionLabel = document.createElement("label");
  descriptionLabel.textContent = "¿Qué te gustaría ver en esta imagen?";
  const description = document.createElement("textarea");
  description.name = "dream";
  description.required = true;
  description.maxLength = 240;
  description.rows = 3;
  description.placeholder = "Pasear junto al mar al amanecer";
  descriptionLabel.append(description);
  const captionLabel = document.createElement("label");
  captionLabel.textContent = "Palabra o frase sobre la imagen (opcional)";
  const caption = document.createElement("input");
  caption.name = "caption";
  caption.maxLength = 22;
  captionLabel.append(caption);
  const suggestion = document.createElement("button");
  suggestion.className = "suggestion";
  suggestion.type = "button";
  suggestion.addEventListener("click", () => {
    caption.value = suggestion.value;
    caption.focus();
  });
  const focusLabel = document.createElement("label");
  focusLabel.className = "check focus";
  const focus = document.createElement("input");
  focus.type = "checkbox";
  focus.name = "focus";
  focus.value = String(number - 1);
  focusLabel.append(focus, " Dar más protagonismo a este sueño");
  fieldset.append(descriptionLabel, captionLabel, suggestion, focusLabel);
  return {fieldset, caption, suggestion};
}

const dreams = Array.from({length: 6}, (_, i) => dreamField(i + 1));
fields.append(...dreams.map(({fieldset}) => fieldset));
function updateCount() {
  dreams.forEach(({fieldset}, index) => {
    fieldset.disabled = fieldset.hidden = index >= Number(count.value);
  });
}
function updateTones() {
  if (accent.value === tone.value) accent.value = "";
  for (const option of accent.options) option.disabled = option.value === tone.value;
  const primary = examples[tone.value];
  const secondary = accent.value ? examples[accent.value] : primary;
  dreams.forEach(({caption, suggestion}, index) => {
    const set = index % 2 ? secondary : primary;
    const label = set.labels[(accent.value ? Math.floor(index / 2) : index) % set.labels.length];
    caption.placeholder = label;
    suggestion.value = label;
    suggestion.textContent = "Usar «" + label + "»";
  });
  phrase.placeholder = primary.phrase;
}
count.addEventListener("change", updateCount);
tone.addEventListener("change", updateTones);
accent.addEventListener("change", updateTones);
updateCount();
updateTones();

if (!endpoint) {
  status.textContent = "El cuestionario aún no está disponible.";
} else if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
  status.textContent = "Completa el cuestionario cuando tengas a mano tus ideas.";
  form.hidden = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    submit.disabled = true;
    error.textContent = "";
    try {
      const response = await fetch(endpoint, {
        method: "POST", credentials: "omit", cache: "no-store", redirect: "error",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({token, dreams: data.getAll("dream"), labels: data.getAll("caption"),
          style: data.get("style"), tones: [data.get("tone"), data.get("accent")].filter(Boolean),
          focus: data.getAll("focus").map(Number),
          phrase: data.get("phrase"), ack: data.has("ack")}),
      });
      const result = await response.json();
      if (!response.ok) {
        error.textContent = result.message;
        return;
      }
      form.reset();
      history.replaceState(null, "", location.pathname);
      form.hidden = true;
      status.textContent = result.message;
      status.tabIndex = -1;
      status.focus();
    } catch {
      error.textContent = "No hemos podido confirmar el envío. Puedes volver a intentarlo o consultar tu pedido en Etsy.";
    } finally {
      submit.disabled = false;
    }
  });
}
