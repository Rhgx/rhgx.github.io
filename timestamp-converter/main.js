// script.js

// IMPORTS MUST BE FIRST
import { loadTimezoneData } from "./modules/dataFetcher.js";
import { parseDateTime } from "./modules/parser.js";
import { formatDateTime, getRelativeTime } from "./modules/formatter.js";

// Global variables
let timezoneData = null;
let previousResults = null; // Store the results from the last conversion
let typedInstances = {}; // Store active Typed.js instances { key: instance }

document.addEventListener("DOMContentLoaded", async () => {
  // --- Get DOM Elements ---
  const dateTimeInput = document.getElementById("dateTimeInput");
  const convertBtn = document.getElementById("convertBtn");
  const outputArea = document.getElementById("outputArea"); // Target for Anime.js
  const errorAlert = document.getElementById("errorAlert");
  const loadingIndicator = document.getElementById("loadingIndicator");

  const outputFields = {
    unixTimestamp: document.getElementById("unixTimestampOutput"),
    shortTime: document.getElementById("shortTimeOutput"),
    longTime: document.getElementById("longTimeOutput"),
    shortDate: document.getElementById("shortDateOutput"),
    longDate: document.getElementById("longDateOutput"),
    longDateShortTime: document.getElementById("longDateShortTimeOutput"),
    longDateDayShortTime: document.getElementById(
      "longDateDayShortTimeOutput",
    ),
    relative: document.getElementById("relativeOutput"),
  };

  let relativeTimeIntervalId = null;

  // --- Debugging ---
  const DEBUG = false;
  function debugLog(...args) {
    if (DEBUG) console.log(...args);
  }

  // --- Load Data ---
  if (loadingIndicator) loadingIndicator.style.display = "block";
  convertBtn.disabled = true;
  dateTimeInput.disabled = true;

  timezoneData = await loadTimezoneData();

  if (loadingIndicator) loadingIndicator.style.display = "none";
  if (timezoneData) {
    convertBtn.disabled = false;
    dateTimeInput.disabled = false;
    dateTimeInput.placeholder =
      "e.g., 14:30 UTC, 2 PM EST, 4.00 @ 10/5/2025 CDT, 2025-05-03T10:00Z";
  } else {
    errorAlert.textContent =
      "Failed to load timezone data. DST features disabled.";
    errorAlert.classList.remove("d-none");
    dateTimeInput.placeholder = "Error loading data...";
  }

  // --- Debugging Listener Attachment ---
  // console.log("Attempting to attach click listener to convertBtn");

  // --- Event Listener for Conversion ---
  convertBtn.addEventListener("click", () => {
    if (!timezoneData) {
      alert("Timezone data not loaded. Cannot perform conversion.");
      return;
    }

    if (relativeTimeIntervalId) {
      clearInterval(relativeTimeIntervalId);
      relativeTimeIntervalId = null;
    }
    Object.values(typedInstances).forEach((instance) => instance?.destroy());
    typedInstances = {};

    const inputStr = dateTimeInput.value;
    if (!inputStr) {
      errorAlert.textContent = "Please enter a date/time value.";
      errorAlert.classList.remove("d-none");
      outputArea.classList.add("d-none");
      outputArea.style.opacity = 1; // Reset opacity on error/clear
      previousResults = null;
      return;
    }

    debugLog("--- Starting Conversion ---");
    debugLog("Input:", inputStr);
    const parsedDate = parseDateTime(inputStr, timezoneData);
    debugLog("Parsed Date Object:", parsedDate);

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      debugLog("Formatting valid date...");
      const formattedResults = formatDateTime(parsedDate);
      debugLog("Formatted Results:", formattedResults);

      let hasError = false;
      let resultsChanged = false;

      if (!previousResults) {
        resultsChanged = true;
      } else {
        for (const key in outputFields) {
          if (
            key !== "relative" &&
            outputFields.hasOwnProperty(key) &&
            formattedResults.hasOwnProperty(key) &&
            previousResults.hasOwnProperty(key) &&
            formattedResults[key].copy !== previousResults[key].copy
          ) {
            resultsChanged = true;
            break;
          }
          if (
            key !== "relative" &&
            (formattedResults[key]?.display === "Error") !==
              (previousResults[key]?.display === "Error")
          ) {
            resultsChanged = true;
            break;
          }
        }
      }
      debugLog("Results changed:", resultsChanged);

      // --- Populate output fields ---
      for (const key in outputFields) {
        if (
          outputFields.hasOwnProperty(key) &&
          formattedResults.hasOwnProperty(key)
        ) {
          const field = outputFields[key];
          const result = formattedResults[key];

          if (result.display === "Error") {
            hasError = true;
            field.value = String(result.display);
            field.dataset.copyValue = result.copy;
            typedInstances[key]?.destroy();
            typedInstances[key] = null;
            continue;
          }

          if (resultsChanged) {
            typedInstances[key]?.destroy();
            const stringsToType = [];
            if (
              previousResults &&
              previousResults[key]?.display &&
              previousResults[key]?.display !== "Error"
            ) {
              field.value = String(previousResults[key].display);
              stringsToType.push("", String(result.display));
            } else {
              field.value = "";
              stringsToType.push(String(result.display));
            }

            if (stringsToType.length > 0) {
              const typed = new Typed(field, {
                strings: stringsToType,
                typeSpeed: 40,
                backSpeed: 20,
                backDelay: stringsToType.length > 1 ? 500 : 0,
                loop: false,
                showCursor: false,
                contentType: "value",
                smartBackspace: false,
                onComplete: (self) => {
                  self.el.value = String(result.display);
                },
                onDestroy: (self) => {
                  if (self.el && formattedResults[key]) {
                    self.el.value = String(formattedResults[key].display);
                  }
                },
              });
              typedInstances[key] = typed;
            } else {
              field.value = String(result.display);
            }
          } else {
            field.value = String(result.display);
          }
          field.dataset.copyValue = result.copy;
        } else if (outputFields.hasOwnProperty(key)) {
          outputFields[key].value = "N/A";
          outputFields[key].dataset.copyValue = "N/A";
          typedInstances[key]?.destroy();
          typedInstances[key] = null;
        }
      } // End loop through outputFields

      if (hasError) {
        debugLog("Error occurred during formatting step.");
        errorAlert.textContent =
          "An error occurred while formatting the date.";
        errorAlert.classList.remove("d-none");
        outputArea.classList.add("d-none");
        outputArea.style.opacity = 1; // Reset opacity
        previousResults = null;
        return;
      }

      // --- Handle Relative Time Update ---
      const relativeOutputElement = outputFields.relative;
      if (relativeOutputElement) {
        relativeTimeIntervalId = setInterval(() => {
          if (
            document.body.contains(relativeOutputElement) &&
            parsedDate &&
            !isNaN(parsedDate.getTime())
          ) {
            const currentRelativeString = getRelativeTime(parsedDate);
            relativeOutputElement.value = currentRelativeString;
            relativeOutputElement.dataset.copyValue = `<t:${Math.floor(
              parsedDate.getTime() / 1000,
            )}:R>`;
          } else {
            clearInterval(relativeTimeIntervalId);
            relativeTimeIntervalId = null;
          }
        }, 1000);
        debugLog("Started relative time interval:", relativeTimeIntervalId);
      }

      // --- Anime.js Fade-in Logic ---
      const isOutputHidden = outputArea.classList.contains("d-none");
      if (isOutputHidden) {
        // Set initial state for fade-in
        outputArea.style.opacity = 0;
        outputArea.classList.remove("d-none"); // Make it take space
        errorAlert.classList.add("d-none");

        // Animate
        anime({
          targets: outputArea,
          opacity: 1,
          duration: 500, // Adjust duration as needed
          easing: "easeOutQuad", // Optional easing
        });
      } else {
        // If already visible, just ensure error is hidden
        errorAlert.classList.add("d-none");
        outputArea.classList.remove("d-none"); // Ensure it's visible
      }

      previousResults = formattedResults;
    } else {
      // Parsing failed
      debugLog("Parsing failed or resulted in invalid date.");
      for (const key in outputFields) {
        if (outputFields.hasOwnProperty(key)) {
          outputFields[key].value = "";
          delete outputFields[key].dataset.copyValue;
          typedInstances[key]?.destroy();
        }
      }
      typedInstances = {};
      errorAlert.textContent =
        "Invalid date/time format or unknown timezone. Try '14:30 UTC', '2 PM EST', '4.00 @ 10/5/2025 CDT', '2025-05-03T10:00Z'.";
      errorAlert.classList.remove("d-none");
      outputArea.classList.add("d-none");
      outputArea.style.opacity = 1; // Reset opacity on error
      previousResults = null;
    }
    debugLog("--- Conversion Finished ---");
  });

  // --- Copy Button Listeners ---
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const targetInputId = button.getAttribute("data-target");
      const targetInput = document.getElementById(targetInputId);
      const valueToCopy = targetInput ? targetInput.dataset.copyValue : null;

      if (
        valueToCopy &&
        valueToCopy !== "Error" &&
        valueToCopy !== "N/A" &&
        navigator.clipboard
      ) {
        navigator.clipboard
          .writeText(valueToCopy)
          .then(() => {
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
            button.disabled = true;
            button.classList.add("btn-success");
            button.classList.remove("btn-outline-secondary");
            setTimeout(() => {
              button.innerHTML = originalIcon;
              button.disabled = false;
              button.classList.remove("btn-success");
              button.classList.add("btn-outline-secondary");
            }, 1500);
          })
          .catch((err) => {
            debugLog("Failed to copy text: ", err);
            alert("Failed to copy. Please copy manually.");
          });
      } else if (
        valueToCopy &&
        valueToCopy !== "Error" &&
        valueToCopy !== "N/A"
      ) {
        /* Fallback */
        const tempTextArea = document.createElement("textarea");
        tempTextArea.value = valueToCopy;
        tempTextArea.style.position = "absolute";
        tempTextArea.style.left = "-9999px";
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
          document.execCommand("copy");
          const originalIcon = button.innerHTML;
          button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
          button.disabled = true;
          button.classList.add("btn-success");
          button.classList.remove("btn-outline-secondary");
          setTimeout(() => {
            button.innerHTML = originalIcon;
            button.disabled = false;
            button.classList.remove("btn-success");
            button.classList.add("btn-outline-secondary");
          }, 1500);
        } catch (err) {
          alert("Failed to copy. Please copy manually.");
        } finally {
          document.body.removeChild(tempTextArea);
        }
      } else {
        debugLog(
          "Could not find valid value to copy for target:",
          targetInputId,
        );
      }
    });
  });

  // --- Enter Key Listener ---
  dateTimeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      convertBtn.click();
    }
  });
}); // End DOMContentLoaded
