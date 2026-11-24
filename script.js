
// Upload part of the home page
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const uploadError = document.getElementById("upload-error");
const analysisBox = document.getElementById("analysis");
const previewImage = document.getElementById("preview");
const analysisBody = document.getElementById("analysis-body");

// Quiz start part of the home page
const expMenu = document.getElementById("exp");
const formError = document.getElementById("form-error");
const startButton = document.getElementById("start-button");

// Quiz page
const questionsBox = document.getElementById("questions");
const quizError = document.getElementById("quiz-error");
const submitButton = document.getElementById("submit-button");

// Quiz results page
const scoreText = document.getElementById("score");
const adviceBox = document.getElementById("advice");
const breakdownBody = document.getElementById("breakdown");
const homeButton = document.getElementById("home-button");

const QUIZ_STATE_KEY = "truth-seeker-quiz";
let currentQuestions = [];


// Tools below

// Creates an HTML element. make("h1", "big", "Hi") makes <h1 class="big">Hi</h1>.
function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

// Returns a shuffled copy of a list.
function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function doRandom(min, max) {
  const numMin = Math.ceil(min);
  const numMax = Math.floor(max);
  return Math.floor(Math.random() * (numMax - numMin) + numMin);
}

// Upload for API

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "tif", "tiff"];
const MAX_MB = 10;

// Checks a file. Returns a message if something is wrong, or "" if it is fine.
function checkFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  const looksLikeImage = (file.type === "" || file.type.indexOf("image/") === 0);

  if (!looksLikeImage || ALLOWED_EXTENSIONS.indexOf(extension) === -1) {
    return "That file isn't a supported image. Use JPG, PNG, WEBP, HEIC, HEIF or TIFF.";
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return "That image is bigger than " + MAX_MB + " MB.";
  }
  return "";
}

// Called when a file is picked OR dropped.
function handleFiles(files) {
  uploadError.textContent = "";

  if (files.length === 0) {
    return;
  }
  if (files.length > 1) {
    uploadError.textContent = "Please upload one image at a time.";
    return;
  }

  const file = files[0];
  const problem = checkFile(file);
  if (problem !== "") {
    uploadError.textContent = problem;
    return;
  }

  analyzeImage(file);
}

if (dropzone && fileInput) {
  // Clicking the box opens the file picker.
  dropzone.onclick = function () {
    fileInput.click();
  };

  // Pressing Enter or Space on the box does the same (for keyboard users).
  dropzone.onkeydown = function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  };

  // Dragging a file over the box.
  dropzone.ondragover = function (event) {
    event.preventDefault(); // needed, or the browser refuses the drop
    dropzone.classList.add("dragging");
  };
  dropzone.ondragleave = function () {
    dropzone.classList.remove("dragging");
  };

  // Dropping the file.
  dropzone.ondrop = function (event) {
    event.preventDefault();
    dropzone.classList.remove("dragging");
    handleFiles(event.dataTransfer.files);
  };

  // Choosing a file with the picker.
  fileInput.onchange = function () {
    handleFiles(fileInput.files);
    fileInput.value = ""; // lets you pick the same file again later
  };
}

// Sends the image to AI or Not and waits for the answer.
// "async/await" just means: wait here until the internet request finishes.
async function analyzeImage(file) {
  // Show the picture right away, with a waiting message
  analysisBox.hidden = false;
  previewImage.hidden = false;
  previewImage.src = URL.createObjectURL(file);
  previewImage.onerror = function () {
    previewImage.hidden = true; // some browsers can't preview HEIC files
  };
  analysisBody.innerHTML = "";
  analysisBody.appendChild(make("p", "muted", "Analyzing your image..."));

  // Package the file the way the API expects: a form with a field named "image"
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      showAnalysisMessage(friendlyError(response.status));
      return;
    }

    const data = await response.json();
    showAnalysis(data.report);
  } catch (error) {
    // The request never reached the server (no internet, or the browser blocked it)
    showAnalysisMessage("We couldn't reach the local server. Make sure the Node.js server is running and try again.");
  }
}

// Turns an error code into a sentence a person can understand.
function friendlyError(status) {
  if (status === 401 || status === 402 || status === 403) {
    return "All configured API keys are invalid or out of credits. Check the API_KEYS setting in .env.";
  }
  if (status === 422) {
    return "The service couldn't read that image. Try a different file.";
  }
  if (status === 429) {
    return "Too many requests. Wait a few seconds and try again.";
  }
  return "Something went wrong (error " + status + "). Please try again.";
}

function showAnalysisMessage(message) {
  analysisBody.innerHTML = "";
  analysisBody.appendChild(make("p", "err", message));
}


// Analysis

// Friendly names for the AI tools the API can recognize.
const GENERATOR_NAMES = {
  midjourney: "Midjourney",
  dall_e: "DALL-E",
  stable_diffusion: "Stable Diffusion",
  this_person_does_not_exist: "ThisPersonDoesNotExist",
  adobe_firefly: "Adobe Firefly",
  flux: "Flux",
  four_o: "GPT-4o"
};

// Adds one line like "Face check: No manipulation found."
function addFinding(label, text) {
  const row = make("p", "finding");
  row.appendChild(make("b", "", label + ": "));
  row.appendChild(document.createTextNode(text));
  analysisBody.appendChild(row);
}

// Finds the AI tool with the highest confidence. Returns its name, or "".
function findLikelyGenerator(generators) {
  let bestName = "";
  let bestScore = 0;
  for (const key in generators) {
    if (generators[key].is_detected && generators[key].confidence > bestScore) {
      bestScore = generators[key].confidence;
      bestName = GENERATOR_NAMES[key] || key.replace(/_/g, " ");
    }
  }
  return bestName;
}

function showAnalysis(report) {
  analysisBody.innerHTML = "";

  const ai = report.ai_generated;
  let kind = "unknown";   // "ai", "human" or "unknown"
  let headline = "We couldn't decide";
  let explanation = "The detector wasn't able to reach a clear answer for this image.";
  let percent = 0;

  if (ai && ai.verdict === "ai") {
    kind = "ai";
    percent = Math.round(ai.ai.confidence * 100);
    headline = "Likely AI-generated";
    explanation = "The detector is " + percent + "% confident this image was made by an AI image generator.";
  } else if (ai && ai.verdict === "human") {
    kind = "human";
    percent = Math.round(ai.human.confidence * 100);
    headline = "Likely a real photo";
    explanation = "The detector is " + percent + "% confident this image was made by a person, not by AI.";
  }

  // Headline, explanation and confidence bar
  analysisBody.appendChild(make("p", "verdict verdict-" + kind, headline));
  analysisBody.appendChild(make("p", "", explanation));

  if (kind !== "unknown") {
    const bar = make("div", "bar");
    const fill = make("div", "bar-fill fill-" + kind);
    fill.style.width = percent + "%";
    bar.appendChild(fill);
    analysisBody.appendChild(bar);
  }

  // Extra details
  if (kind === "ai") {
    const generatorName = findLikelyGenerator(ai.generator || {});
    if (generatorName !== "") {
      addFinding("Likely made with", generatorName);
    }
  }

  if (report.deepfake) {
    if (report.deepfake.is_detected) {
      addFinding("Face check", "Signs of a manipulated or swapped face were found (" + Math.round(report.deepfake.confidence * 100) + "% confident).");
    } else {
      addFinding("Face check", "No signs of a manipulated or swapped face were found.");
    }
  } else {
    addFinding("Face check", "Not available (no face may have been found).");
  }

  if (report.quality && report.quality.is_detected === false) {
    addFinding("Image quality", "Low. Blur or heavy compression can make the result less reliable.");
  }

  analysisBody.appendChild(make("p", "muted small", "Automated detectors are good but not perfect. Treat this as a strong hint, not proof."));
}


// Quiz page

function readQuizState() {
  try {
    const saved = window.sessionStorage.getItem(QUIZ_STATE_KEY);
    if (!saved) {
      return { state: null, error: "No quiz was found. Go back home and start a new quiz." };
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.questions)) {
      throw new Error("Saved quiz questions are missing.");
    }

    const questions = parsed.questions.map(function (image) {
      return ITEMS.find(function (item) {
        return item.img === image;
      });
    });
    if (questions.some(function (question) { return !question; })) {
      throw new Error("Saved quiz contains an unknown question.");
    }

    if (parsed.answers !== undefined &&
        (!Array.isArray(parsed.answers) ||
         parsed.answers.length !== questions.length ||
         parsed.answers.some(function (answer) { return typeof answer !== "string"; }))) {
      throw new Error("Saved quiz answers are invalid.");
    }

    return {
      state: { questions: questions, answers: parsed.answers },
      error: ""
    };
  } catch (error) {
    console.error("Unable to read saved quiz data.", error);
    return {
      state: null,
      error: "Your saved quiz couldn't be loaded. Go back home and start a new quiz."
    };
  }
}

function saveQuizState(state, errorElement) {
  try {
    window.sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Unable to save quiz data.", error);
    errorElement.textContent = "Your quiz couldn't be saved. Please check that browser storage is available and try again.";
    return false;
  }
}

if (startButton && expMenu && formError) {
  startButton.onclick = function () {
    if (expMenu.value === "") {
      formError.textContent = "Choose how familiar you are with deepfakes first.";
      return;
    }
    formError.textContent = "";

    currentQuestions = shuffle(ITEMS).slice(0, QUESTIONS_PER_QUIZ);
    if (!saveQuizState({
      familiarity: expMenu.value,
      questions: currentQuestions.map(function (question) { return question.img; })
    }, formError)) {
      return;
    }
    window.location.href = "index/quiz.html";
  };
}

if (questionsBox && submitButton && quizError) {
  const loaded = readQuizState();
  if (!loaded.state) {
    quizError.textContent = loaded.error;
    submitButton.disabled = true;
  } else {
    currentQuestions = loaded.state.questions;
    for (let i = 0; i < currentQuestions.length; i++) {
      const q = currentQuestions[i];
      const box = make("fieldset", "q");
      box.appendChild(make("legend", "", "Item " + (i + 1) + " of " + currentQuestions.length + ": Which image is generated?"));

      const picture = make("img");
      picture.src = "../" + q.img;
      picture.alt = "Image for item " + (i + 1);
      picture.tabIndex = 0;
      picture.setAttribute("role", "button");
      picture.setAttribute("aria-label", "Zoom in on image for item " + (i + 1));
      picture.onerror = function () {
        picture.alt = "Image not found: " + q.img;
      };
      function openImageModal() {
        const modal = make("div", "image-modal");
        const zoomedImage = make("img");
        zoomedImage.src = picture.src;
        zoomedImage.alt = picture.alt;
        modal.appendChild(zoomedImage);
        modal.onclick = function () { modal.remove(); };
        document.body.appendChild(modal);
        document.onkeydown = function (event) {
          if (event.key === "Escape") {
            modal.remove();
            document.onkeydown = null;
          }
        };
        modal.tabIndex = -1;
        modal.focus();
      }
      picture.onclick = openImageModal;
      picture.onkeydown = function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openImageModal();
        }
      };
      box.appendChild(picture);

      const options = q.choices || CHOICES;
      for (let j = 0; j < options.length; j++) {
        const label = make("label", "opt");
        const radio = make("input");
        radio.type = "radio";
        radio.name = "question" + i;
        radio.value = options[j];
        label.appendChild(radio);
        label.appendChild(document.createTextNode(" " + options[j]));
        box.appendChild(label);
      }
      questionsBox.appendChild(box);
    }
  }

  submitButton.onclick = function () {
    const answers = [];
    for (let i = 0; i < currentQuestions.length; i++) {
      const selected = questionsBox.querySelector('input[name="question' + i + '"]:checked');
      if (!selected) {
        quizError.textContent = "Item " + (i + 1) + " has no answer yet.";
        return;
      }
      answers.push(selected.value);
    }

    if (!saveQuizState({
      questions: currentQuestions.map(function (question) { return question.img; }),
      answers: answers
    }, quizError)) {
      return;
    }
    window.location.href = "results.html";
  };
}


// Quiz Results

function showQuizResults(questions, answers) {
  adviceBox.innerHTML = "";
  breakdownBody.innerHTML = "";

  let score = 0;
  const tally = {};  // example: { skin: { seen: 3, missed: 2 } }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const isCorrect = (answers[i] === q.answer);

    // Score and per-category counts
    if (isCorrect) {
      score = score + 1;
    }
    if (!tally[q.category]) {
      tally[q.category] = { seen: 0, missed: 0 };
    }
    tally[q.category].seen = tally[q.category].seen + 1;
    if (!isCorrect) {
      tally[q.category].missed = tally[q.category].missed + 1;
    }

    // One table row per question
    const row = make("tr");
    row.appendChild(make("td", "", String(i + 1)));
    row.appendChild(make("td", isCorrect ? "ok" : "no", answers[i] + (isCorrect ? " (correct)" : " (wrong)")));
    row.appendChild(make("td", "", q.answer));
    row.appendChild(make("td", "", CATEGORIES[q.category].label));
    breakdownBody.appendChild(row);
  }

  scoreText.textContent = score + " / " + questions.length;

  // Advice: a tip for each category where half or more were missed
  let adviceCount = 0;
  for (const key in tally) {
    const t = tally[key];
    if (t.missed > 0 && t.missed / t.seen >= 0.5) {
      const info = CATEGORIES[key];
      const tip = make("div", "advice");
      tip.appendChild(make("b", "", info.label + ": missed " + t.missed + " of " + t.seen));
      tip.appendChild(document.createTextNode(info.advice));
      adviceBox.appendChild(tip);
      adviceCount = adviceCount + 1;
    }
  }
  if (adviceCount === 0) {
    adviceBox.appendChild(make("p", "", "You didn't repeatedly miss any one type of image."));
  }

  const ranIndex = doRandom(0, Object.keys(GENERAL_ADVICE).length);
  adviceBox.appendChild(make("p", "muted", GENERAL_ADVICE[Object.keys(GENERAL_ADVICE)[ranIndex]].advice));

}

if (scoreText && adviceBox && breakdownBody) {
  const loaded = readQuizState();
  const resultsError = document.getElementById("results-error");
  if (!loaded.state || !loaded.state.answers) {
    resultsError.textContent = loaded.state
      ? "Quiz answers weren't found. Go back home and start a new quiz."
      : loaded.error;
  } else {
    showQuizResults(loaded.state.questions, loaded.state.answers);
  }
}

if (homeButton) {
  homeButton.onclick = function () {
    window.location.href = "../index.html";
  };
}
