"use strict";

const CHARACTER_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%&*?"
};

const passwordField = document.querySelector("#password");
const passwordCount = document.querySelector("#password-count");
const lengthInput = document.querySelector("#length");
const lengthValue = document.querySelector("#length-value");
const strengthLabel = document.querySelector("#strength-label");
const strengthMeter = document.querySelector("#strength-meter");
const errorMessage = document.querySelector("#form-error");
const toggleVisibilityButton = document.querySelector("#toggle-visibility");
const toast = document.querySelector("#toast");

let toastTimeout;
let generatedPoolSize = 0;

function secureRandomInteger(maxExclusive) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1) {
    throw new RangeError("El límite aleatorio debe ser un entero positivo.");
  }

  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const randomValues = new Uint32Array(1);
  let value;

  do {
    crypto.getRandomValues(randomValues);
    value = randomValues[0];
  } while (value >= limit);

  return value % maxExclusive;
}

function secureShuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInteger(index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function getSelectedSets() {
  return Object.entries(CHARACTER_SETS)
    .filter(([key]) => document.querySelector(`#${key}`).checked)
    .map(([, characters]) => characters);
}

function generatePassword(length, selectedSets) {
  if (selectedSets.length === 0) {
    throw new Error("Selecciona al menos un tipo de carácter.");
  }
  if (length < selectedSets.length) {
    throw new Error("La longitud debe permitir incluir al menos un carácter de cada tipo.");
  }
  if (!globalThis.crypto || typeof crypto.getRandomValues !== "function") {
    throw new Error("Este navegador no ofrece generación aleatoria criptográficamente segura.");
  }

  const characterPool = [...new Set(selectedSets.join(""))];
  const passwordCharacters = selectedSets.map(
    (characters) => characters[secureRandomInteger(characters.length)]
  );

  while (passwordCharacters.length < length) {
    passwordCharacters.push(characterPool[secureRandomInteger(characterPool.length)]);
  }

  return secureShuffle(passwordCharacters).join("");
}

function calculateStrength(length, poolSize) {
  if (length === 0 || poolSize === 0) {
    return { level: 0, label: "—" };
  }

  const entropyBits = length * Math.log2(poolSize);
  let level;

  if (entropyBits < 40) level = 1;
  else if (entropyBits < 60) level = 2;
  else if (entropyBits < 80) level = 3;
  else if (entropyBits < 100) level = 4;
  else level = 5;

  return {
    level,
    label: ["—", "Muy débil", "Débil", "Media", "Fuerte", "Muy fuerte"][level]
  };
}

function updateStrength(length, poolSize) {
  const strength = calculateStrength(length, poolSize);
  strengthLabel.textContent = strength.label;
  strengthLabel.dataset.level = String(strength.level);
  strengthMeter.dataset.level = String(strength.level);
  strengthMeter.setAttribute("aria-valuenow", String(strength.level));
}

function updateLengthDisplay() {
  const length = Number(lengthInput.value);
  lengthValue.value = String(length);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function createNewPassword() {
  clearError();
  try {
    const password = generatePassword(Number(lengthInput.value), getSelectedSets());
    passwordField.value = password;
    generatedPoolSize = [...new Set(getSelectedSets().join(""))].length;
    passwordCount.textContent = `${password.length} caracteres`;
    updateStrength(password.length, generatedPoolSize);
  } catch (error) {
    showError(error instanceof Error ? error.message : "No se pudo generar la contraseña.");
  }
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function copyPassword() {
  if (!passwordField.value) {
    showError("Genera una contraseña antes de copiarla.");
    return;
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    showError("El portapapeles no está disponible. Abre la aplicación en un contexto seguro, como localhost o HTTPS.");
    return;
  }

  try {
    await navigator.clipboard.writeText(passwordField.value);
    clearError();
    showToast("Contraseña copiada al portapapeles");
  } catch {
    showError("No se pudo acceder al portapapeles. Comprueba los permisos del navegador.");
  }
}

function togglePasswordVisibility() {
  const isVisible = passwordField.type === "text";
  passwordField.type = isVisible ? "password" : "text";
  toggleVisibilityButton.classList.toggle("is-visible", !isVisible);
  const action = isVisible ? "Mostrar" : "Ocultar";
  toggleVisibilityButton.setAttribute("aria-label", `${action} contraseña`);
  toggleVisibilityButton.title = `${action} contraseña`;
}

document.querySelector("#generate-button").addEventListener("click", createNewPassword);
document.querySelector("#copy-button").addEventListener("click", copyPassword);
toggleVisibilityButton.addEventListener("click", togglePasswordVisibility);
lengthInput.addEventListener("input", updateLengthDisplay);
document.querySelectorAll(".character-options input").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    clearError();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.repeat && !event.target.matches("button, input")) {
    createNewPassword();
  }
});

updateLengthDisplay();
createNewPassword();
