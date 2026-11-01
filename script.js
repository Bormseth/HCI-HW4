// Where the Python API is running
const API_URL = "http://localhost:8005";

// Data the page keeps track of
let questions = [];    // the list of questions from the API
let currentIndex = 0;  // which question is showing in the main area
let editingId = null;  // the id of the question currently being edited

// Grab the HTML elements we need (CSS-style selectors: "#id" or ".class")
const previewList = document.querySelector("#preview-list");
const cardArea = document.querySelector("#card-area");
const errorMessage = document.querySelector("#error-message");
const newQuestion = document.querySelector("#new-question");
const newAnswer = document.querySelector("#new-answer");
const editDialog = document.querySelector("#edit-dialog");
const editQuestion = document.querySelector("#edit-question");
const editAnswer = document.querySelector("#edit-answer");
const addButton = document.querySelector("#add-button");
const updateButton = document.querySelector("#update-button");
const prevButton = document.querySelector("#prev-button");
const nextButton = document.querySelector("#next-button");
const counter = document.querySelector("#counter");


// ---------- Errors ----------

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}


// ---------- Talking to the API ----------

async function apiGet(path) {
  try {
    const response = await fetch(API_URL + path);
    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }
    return await response.json();
  } catch (error) {
    showError("Could not reach API: " + error.message);
    return [];
  }
}

async function apiSend(method, path, data) {
  try {
    const response = await fetch(API_URL + path, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }
    return true;
  } catch (error) {
    showError("Could not reach API: " + error.message);
    return false;
  }
}


// ---------- Showing the page ----------

// Get the questions from the API, then redraw everything.
async function renderPage() {
  hideError();
  questions = await apiGet("/questions");
  showPage();
}

// Redraw the sidebar and the main card from the data we already have.
function showPage() {
  // keep currentIndex inside the list (e.g. after a delete)
  if (currentIndex >= questions.length) currentIndex = questions.length - 1;
  if (currentIndex < 0) currentIndex = 0;
  renderPreviews();
  showCard();
  updateCounter();
}

// Sidebar: one preview per question. Clicking a preview shows that card.
// Previews are buttons so they can be reached and activated with the keyboard.
function renderPreviews() {
  previewList.innerHTML = "";
  questions.forEach(function (question, index) {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "preview";
    if (index === currentIndex) {
      preview.classList.add("active");
      preview.setAttribute("aria-current", "true");
    }
    preview.textContent = question.q;
    preview.title = question.q; // full text on hover, since the preview is truncated
    preview.addEventListener("click", function () {
      currentIndex = index;
      showPage();
    });
    previewList.append(preview);
  });
}

// Create a card to represent current question/answer (stored at questions[currentIndex])
function showCard() {
  cardArea.innerHTML = "";
  if (questions.length === 0) {
    cardArea.textContent = "No questions to show.";
    return;
  }
  const question = questions[currentIndex];

  const card = document.createElement("div");
  card.className = "card";

  const label = document.createElement("p");
  label.className = "card-label";
  label.textContent = "Question";

  const questionButton = document.createElement("button");
  questionButton.type = "button";
  questionButton.className = "question";
  questionButton.textContent = question.q;
  questionButton.setAttribute("aria-expanded", "false");

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Click the question to show the answer";

  const answerText = document.createElement("p");
  answerText.className = "answer hidden";
  answerText.textContent = question.a;

  questionButton.addEventListener("click", function () {
    const nowHidden = answerText.classList.toggle("hidden");
    questionButton.setAttribute("aria-expanded", String(!nowHidden));
    hint.textContent = nowHidden
      ? "Click the question to show the answer"
      : "Click the question to hide the answer";
  });

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", function () {
    openEditDialog(question);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function () {
    deleteQuestion(question);
  });

  actions.append(editButton, deleteButton);
  card.append(label, questionButton, hint, answerText, actions);
  cardArea.append(card);
}


// ---------- Navigation ----------

// Move to the previous card, wrapping from the first card to the last.
function showPrevious() {
  if (questions.length === 0) return;
  currentIndex = (currentIndex - 1 + questions.length) % questions.length;
  showPage();
}

// Move to the next card, wrapping from the last card to the first.
function showNext() {
  if (questions.length === 0) return;
  currentIndex = (currentIndex + 1) % questions.length;
  showPage();
}

// Update the progress text ("Card 3 of 3") and disable navigation when there is nothing to move to.
function updateCounter() {
  if (questions.length === 0) {
    counter.textContent = "No cards";
  } else {
    counter.textContent = "Card " + (currentIndex + 1) + " of " + questions.length;
  }
  prevButton.disabled = questions.length < 2;
  nextButton.disabled = questions.length < 2;
}

prevButton.addEventListener("click", showPrevious);
nextButton.addEventListener("click", showNext);


// ---------- Input constraints ----------

// A card needs a real (non-blank) question and answer.
function hasText(input) {
  return input.value.trim() !== "";
}

function updateAddButton() {
  addButton.disabled = !(hasText(newQuestion) && hasText(newAnswer));
}

function updateUpdateButton() {
  updateButton.disabled = !(hasText(editQuestion) && hasText(editAnswer));
}

newQuestion.addEventListener("input", updateAddButton);
newAnswer.addEventListener("input", updateAddButton);
editQuestion.addEventListener("input", updateUpdateButton);
editAnswer.addEventListener("input", updateUpdateButton);


// ---------- Actions ----------

async function deleteQuestion(question) {
  await apiSend("DELETE", "/delete/" + question.id);
  renderPage();
}

function openEditDialog(question) {
  editingId = question.id;
  editQuestion.value = question.q;
  editAnswer.value = question.a;
  updateUpdateButton();
  editDialog.showModal();
}

document.querySelector("#close-dialog").addEventListener("click", function () {
  editDialog.close();
});

updateButton.addEventListener("click", async function () {
  if (!hasText(editQuestion) || !hasText(editAnswer)) return;
  editDialog.close();
  await apiSend("PUT", "/update/" + editingId, {
    question: editQuestion.value.trim(),
    answer: editAnswer.value.trim()
  });
  renderPage();
});

addButton.addEventListener("click", async function () {
  if (!hasText(newQuestion) || !hasText(newAnswer)) return;
  const ok = await apiSend("POST", "/add", {
    question: newQuestion.value.trim(),
    answer: newAnswer.value.trim()
  });
  if (!ok) return;
  newQuestion.value = "";
  newAnswer.value = "";
  updateAddButton();
  currentIndex = questions.length; // jump to the new card (clamped in showPage)
  renderPage();
});


// ---------- Start the app ----------
updateAddButton();
renderPage();