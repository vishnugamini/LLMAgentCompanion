let codeSnippets = [];
$(document).on("click", ".code-snippet-widget", function () {
  let msg_id = $(this).data("msg-id");
  showCodeInModal(msg_id);
});

function showCodeInModal(msg_id) {
  let codeSnippet = codeSnippets.find((snippet) => snippet.id === msg_id);
  if (codeSnippet) {
    let modalHtml = `
      <div class="modal" id="code-modal">
        <div class="modal-content">
          <div class="modal-header">
            <button class="copy-button" title="Copy to clipboard">
              <i class="fas fa-copy"></i> Copy
            </button>
            <span class="close-code-modal">&times;</span>
          </div>
          <pre><code>${escapeHtml(codeSnippet.code)}</code></pre>
        </div>
      </div>
    `;
    $("body").append(modalHtml);

    $("#code-modal").show();

    $(".copy-button").click(function () {
      const codeText = codeSnippet.code;
      navigator.clipboard
        .writeText(codeText)
        .then(() => {
          const $copyButton = $(this);
          $copyButton.html('<i class="fas fa-check"></i> Copied!');
          setTimeout(() => {
            $copyButton.html('<i class="fas fa-copy"></i> Copy');
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
          alert("Failed to copy code to clipboard");
        });
    });

    $(".close-code-modal").click(function () {
      $("#code-modal").remove();
    });

    $(window).click(function (event) {
      if (event.target.id === "code-modal") {
        $("#code-modal").remove();
      }
    });
  }
}
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  const voiceInputBtn = document.getElementById("voice-input-btn");
  const promptTextarea = document.getElementById("prompt");
  const sendButton = document.getElementById("send-btn");

  voiceInputBtn.addEventListener("click", () => {
    recognition.start();
    voiceInputBtn.classList.add("listening");
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;

    promptTextarea.value = transcript;
  });

  recognition.addEventListener("speechend", () => {
    recognition.stop();
    voiceInputBtn.classList.remove("listening");
    setTimeout(() => {
      sendButton.click();
    }, 500);
  });

  recognition.addEventListener("error", (event) => {
    console.error("Speech recognition error:", event.error);
    voiceInputBtn.classList.remove("listening");

    alert("Error with speech recognition: " + event.error);
  });
} else {
  console.warn("SpeechRecognition API is not supported in this browser.");
  document.getElementById("voice-input-btn").style.display = "none";
}
const sendButton = document.getElementById("send-btn");
const promptTextareas = document.getElementById("prompt");

sendButton.classList.remove("show");

promptTextareas.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";

  if (this.value.trim() !== "") {
    sendButton.classList.add("show");
  } else {
    sendButton.classList.remove("show");
  }
});

function escapeHtml(text) {
  if (!text) {
    return "";
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
const promptTextarea = document.getElementById("prompt");

promptTextarea.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

$(document).ready(function () {
  var socket = io();
  $("#refresh-btn").click(function () {
    refresh();
  });

  $("#clear-btn").click(function () {
    clear();
  });

  $("#send-btn").click(function () {
    sendPrompt();
  });

  $("#end-btn").click(function () {
    endProcessing();
  });

  $("#prompt").on("keydown", function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
      return false;
    }
  });

  socket.on("connect", function () {
    console.log("Connected to server");
  });

  socket.on("agent_response", function (data) {
    if (data.type === "thinking_message") {
      displayThinkingMessage(data.content, data.msg_id);
    }
    if (data.type === "loading_message") {
      displayLoadingMessage(data.content, data.msg_id);
    } else if (data.type === "search_results") {
      updateSearchResults(data.content, data.results, data.msg_id);
    } else if (data.type === "compiler_message") {
      displayCodeExecutionMessage(data.content, data.code, data.msg_id);
    } else if (data.type === "success_message") {
      updateLoadingMessage(data.msg_id, data.content);
    } else if (data.type === "error_message") {
      updateLoadingMessageWithError(data.msg_id, data.content, data.code);
    } else if (data.type === "error") {
      displayErrorMessage(data.content);
    } else if (data.type === "thinking_message") {
      displayThinkingMessage(data.content, data.msg_id);
    } else {
      displayAgentMessage(data.content);
    }
    scrollChatToBottom();
  });
  socket.on("agent_status", function (data) {
    const statusElement = $("#agent-status");
    if (data.status === "true") {
      statusElement.text("Thinking");
      statusElement.removeClass("inactive").addClass("active");
      toggleButtons(true);
    } else {
      statusElement.text("Inactive");
      statusElement.removeClass("active").addClass("inactive");
      toggleButtons(false);
    }
  });
  $(document).ready(function () {
    $("#preview-btn").click(function () {
      showPreviewModal();
    });
  });

  function showPreviewModal() {
    let modalHtml = `
      <div class="modal" id="preview-modal">
        <div class="modal-content">
          <span class="close-preview-modal">&times;</span>
          <div class="modal-body">
            <div class="web-app-preview">
              <iframe id="preview-iframe" src="about:blank" frameborder="0" scrolling="yes"></iframe>
            </div>
          </div>
        </div>
      </div>
    `;
    $("body").append(modalHtml);

    $("#preview-modal").css({
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      width: "100vw",
      height: "100vh",
      "background-color": "rgba(0, 0, 0, 0.9)",
      "z-index": "9999",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
    });

    $("#preview-modal .modal-content").css({
      position: "relative",
      width: "100vw",
      height: "100vh",
      "background-color": "#fff",
      display: "flex",
      "flex-direction": "column",
      overflow: "hidden",
      margin: "0",
      padding: "0",
    });

    $("#preview-modal .modal-body").css({
      flex: "1",
      overflow: "hidden",
      padding: "0",
      margin: "0",
      width: "100%",
      height: "100%",
    });

    $("#preview-modal .web-app-preview").css({
      width: "100%",
      height: "100%",
      "background-color": "#fff",
      overflow: "hidden",
      display: "flex",
    });

    $("#preview-modal .web-app-preview iframe").css({
      width: "100%",
      height: "100%",
      border: "none",
      margin: "0",
      padding: "0",
      overflow: "auto",
      flex: "1",
    });

    $("#preview-modal .close-preview-modal").css({
      position: "fixed",
      top: "10px",
      right: "20px",
      "font-size": "40px",
      cursor: "pointer",
      color: "#000000",
      "z-index": "10000",
      "text-shadow": "0 0 10px white",
    });

    $("#preview-modal .close-preview-modal").click(function () {
      $("#preview-modal").remove();
    });

    $(document).on("keydown", function (e) {
      if (e.key === "Escape") {
        $("#preview-modal").remove();
      }
    });

    $("#preview-modal").on("click", function (e) {
      if ($(e.target).is("#preview-modal")) {
        $("#preview-modal").remove();
      }
    });

    renderWebApp();
  }

  function renderWebApp() {
    const iframe = document.getElementById("preview-iframe");
    iframe.onload = function () {
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow.document;

        if (!iframeDoc.querySelector('meta[name="viewport"]')) {
          const meta = iframeDoc.createElement("meta");
          meta.name = "viewport";
          meta.content =
            "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
          iframeDoc.head.appendChild(meta);
        }
      } catch (e) {
        console.log(
          "Cannot access iframe content - likely due to same-origin policy"
        );
      }
    };

    iframe.src = "render/index.html";
  }

  function scrollChatToBottom() {
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
  }

  function scrollThinkingWindowToBottom() {
    $("#think-window").scrollTop($("#think-window")[0].scrollHeight);
  }

  function displayThinkingMessage(message, msg_id) {
    // Updated regex to match just the step number with optional parenthesis
    let regex = /(\d+)\)/g;
    let parts = message.split(regex);
    let items = [];

    for (let i = 1; i < parts.length; i += 2) {
      let number = parts[i].trim(); // Get the number without the closing parenthesis
      let content = parts[i + 1] ? parts[i + 1].trim() : ""; // Get the content after the number
      items.push({ number: number, content: content });
    }

    let html = `
        <h3 class="think-header" id="think-title-${msg_id}">
            THINKING PHASE
        </h3>
        <div class="thinking-container" id="thinking-container-${msg_id}">
        </div>
    `;
    $("#think-window").html(html);

    typeThinkingSteps(items, msg_id);
  }

  function typeThinkingSteps(steps, msg_id) {
    let container = $(`#thinking-container-${msg_id}`);
    let stepIndex = 0;

    function typeNextStep() {
      if (stepIndex < steps.length) {
        let step = steps[stepIndex];

        let stepHtml = `
                    <div class="thinking-card" id="thinking-card-${msg_id}-${stepIndex}">
                    <div class="card-header">
                        <span class="step-number">Step ${step.number}</span>
                    </div>
                    <div class="card-body">
                        <p id="step-content-${msg_id}-${stepIndex}"></p>
                    </div>
                    </div>
                `;
        container.append(stepHtml);
        scrollThinkingWindowToBottom();

        typeStepContent(step.content, msg_id, stepIndex, function () {
          stepIndex++;
          typeNextStep();
        });
      } else {
        $("#think-window").removeClass("highlight");
      }
    }

    $("#think-window").addClass("highlight");
    typeNextStep();
  }

  function typeStepContent(content, msg_id, stepIndex, callback) {
    let contentElement = $(`#step-content-${msg_id}-${stepIndex}`);
    let index = 0;
    let speed = 5;
    let tempContent = "";

    function typeChar() {
      if (index < content.length) {
        let currentChar = content.charAt(index);
        tempContent += currentChar;
        contentElement.html(escapeHtml(tempContent));
        index++;
        scrollThinkingWindowToBottom();
        setTimeout(typeChar, speed);
      } else {
        let parsedContent = marked.parse(tempContent);
        contentElement.html(parsedContent);
        scrollThinkingWindowToBottom();
        if (callback) callback();
      }
    }

    typeChar();
  }

  function toggleButtons(isActive) {
    if (isActive) {
      $("#send-btn").prop("disabled", true).hide();
      $("#end-btn").show();
    } else {
      $("#send-btn").prop("disabled", false).show();
      $("#end-btn").hide();
    }
  }
  function endProcessing() {
    socket.emit("end_processing");
    toggleButtons(false);
  }
  function updateSearchResults(message, results, msg_id) {
    let html = `
            <span>${escapeHtml(message)}</span>
            <i class="bi bi-check-circle-fill" style="margin-left: 10px;"></i>
            <pre class="hidden-results" id="results-block-${msg_id}" style="display: none; margin-top: 10px;"><code>${escapeHtml(
      results
    )}</code></pre>
        `;

    $(`#msg-${msg_id}`).html(html);
    $(`#msg-${msg_id}`)
      .removeClass("loading-message")
      .addClass("search-results-message");

    $(`#show-results-${msg_id}`).click(function () {
      toggleResultsVisibility(msg_id);
    });
  }

  function toggleResultsVisibility(msg_id) {
    let resultsBlock = $(`#results-block-${msg_id}`);
    let showResultsBtn = $(`#show-results-${msg_id}`);

    if (resultsBlock.is(":visible")) {
      resultsBlock.hide();
      showResultsBtn.text("Show Results");
    } else {
      resultsBlock.show();
      showResultsBtn.text("Hide Results");
    }
  }
  function displayCodeExecutionMessage(message, code, msg_id) {
    code = code || "No code available";

    codeSnippets.push({ id: msg_id, code: code });

    let html = `
      <div class="message code-execution-message" id="msg-${msg_id}">
        <div class="result-header">Result</div>
        <span>${escapeHtml(message)}</span>
        <button class="show-code-btn" id="show-code-${msg_id}" data-msg-id="${msg_id}">code</button>
        <pre class="hidden-code" id="code-block-${msg_id}" style="display: none;"><code>${escapeHtml(
      code
    )}</code></pre>
      </div>
    `;
    $("#chat-window").append(html);
    updateCodeSidebar(msg_id, code);

    $(`#show-code-${msg_id}`).click(function () {
      toggleCodeVisibility(msg_id);
    });
  }

  function displayLoadingMessage(message, msg_id) {
    let html = `
            <div class="message loading-message" id="msg-${msg_id}">
                <span>${escapeHtml(message)}</span>
                <div class="spinner-border spinner-border-sm text-primary" role="status" style="margin-left: 10px;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    $("#chat-window").append(html);
  }

  function toggleCodeVisibility(msg_id) {
    let codeBlock = $(`#code-block-${msg_id}`);
    let showCodeBtn = $(`#show-code-${msg_id}`);

    if (codeBlock.is(":visible")) {
      codeBlock.hide();
      showCodeBtn.text("Code");
    } else {
      codeBlock.show();
      showCodeBtn.text("Hide Code");
    }
  }

  function updateLoadingMessage(msg_id, message) {
    let messageElement = $(`#msg-${msg_id}`);
    if (messageElement.length) {
      messageElement.removeClass("loading-message").addClass("success-message");
      messageElement.html(`
                <span>${message}</span>
                <i class="bi bi-check-circle-fill tick-icon"></i>
            `);
    }
  }
  function updateCodeSidebar(msg_id, code, isError = false) {
    let codePreview = code.split("\n")[0];
    if (codePreview.length > 30) {
      codePreview = codePreview.substring(0, 27) + "...";
    }

    let snippetClass = "code-snippet-widget";
    if (isError) {
      snippetClass += " error-snippet";
    }

    let snippetHtml = `
      <div class="${snippetClass}" data-msg-id="${msg_id}">
        <span>${escapeHtml(codePreview)}</span>
      </div>
    `;
    $("#code-snippets-container").append(snippetHtml);
  }

  function updateLoadingMessageWithError(msg_id, message, code) {
    let messageElement = $(`#msg-${msg_id}`);
    if (messageElement.length) {
      messageElement.removeClass("loading-message").addClass("error-message");
      messageElement.html(`
        <span>${escapeHtml(message)}</span>
        <i class="bi bi-exclamation-triangle-fill"></i>
      `);
    }

    codeSnippets.push({ id: msg_id, code: code });

    updateCodeSidebar(msg_id, code, true);
  }

  function displayErrorMessage(message) {
    let html = `
            <div class="message error-message">
                <i class="bi bi-exclamation-triangle-fill"></i> ${message}
            </div>
        `;
    $("#chat-window").append(html);
  }

  function displayAgentMessage(message) {
    let msg_id = Date.now();
    let html = `
            <div class="message agent-message" id="msg-${msg_id}">
                <span></span>
            </div>
        `;
    $("#chat-window").append(html);
    typeMessageCharacterByCharacter(message, msg_id);
  }
  function typeMessageCharacterByCharacter(message, msg_id) {
    let messageElement = $(`#msg-${msg_id}`).find("span");
    let index = 0;
    let speed = 5;
    let tempMessage = "";

    function typeChar() {
      if (index < message.length) {
        let currentChar = message.charAt(index);
        tempMessage += currentChar;
        messageElement.html(escapeHtml(tempMessage));
        index++;
        scrollChatToBottom();
        setTimeout(typeChar, speed);
      } else {
        let parsedMessage = marked.parse(tempMessage);
        messageElement.html(parsedMessage);
        scrollChatToBottom();
      }
    }
    typeChar();
  }

  function clear() {
    const outerDiv = document.getElementById("think-window");
    outerDiv.querySelector(".thinking-container").innerHTML = "";
    document.getElementById("chat-window").innerHTML = "";
  }

  function refresh() {
    socket.emit("refresh");
  }

  function sendPrompt() {
    let prompt = $("#prompt").val().trim();
    if (prompt === "") {
      return;
    }

    let html = `
        <div class="message user-message">
            <span>${prompt}</span>
        </div>
    `;
    $("#chat-window").append(html);
    scrollChatToBottom();
    $("#prompt").val("");

    $("#prompt").css("height", "");

    socket.emit("user_prompt", { prompt: prompt });
  }

  function scrollChatToBottom() {
    $("#chat-window").scrollTop($("#chat-window")[0].scrollHeight);
  }
});

const apiBtn = document.getElementById("api-btn");
const apiModal = document.getElementById("api-modal");
const closeBtn = document.querySelector(".close-btn");

apiBtn.addEventListener("click", () => {
  apiModal.style.display = "block";
});

closeBtn.addEventListener("click", () => {
  apiModal.style.display = "none";
});

window.addEventListener("click", (event) => {
  if (event.target === apiModal) {
    apiModal.style.display = "none";
  }
});
