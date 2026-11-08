"use strict";

const token = location.hash.slice(1);
const form = document.querySelector("#intake");
const status = document.querySelector("#status");
const fields = document.querySelector("#dreams");
const count = document.querySelector("#count");
const error = document.querySelector("#error");
const submit = form.querySelector("button");
const endpoint = document.querySelector('meta[name="intake-endpoint"]').content;

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
  caption.placeholder = "Calma";
  captionLabel.append(caption);
  fieldset.append(descriptionLabel, captionLabel);
  return fieldset;
}

const dreams = Array.from({length: 6}, (_, i) => dreamField(i + 1));
fields.append(...dreams);
function updateCount() {
  dreams.forEach((field, index) => {
    field.disabled = field.hidden = index >= Number(count.value);
  });
}
count.addEventListener("change", updateCount);
updateCount();

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
          style: data.get("style"), phrase: data.get("phrase"), ack: data.has("ack")}),
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
