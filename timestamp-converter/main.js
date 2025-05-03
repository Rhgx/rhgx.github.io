// main.js
import { loadTimezoneData } from "./modules/dataFetcher.js";
import { parseDateTime } from "./modules/parser.js";
import { formatDateTime, getRelativeTime } from "./modules/formatter.js";

// Global variable to store loaded timezone data
let timezoneData = null;

document.addEventListener("DOMContentLoaded", async () => {
  // --- Get DOM Elements ---
  const dateTimeInput = document.getElementById("dateTimeInput");
  const convertBtn = document.getElementById("convertBtn");
  const outputArea = document.getElementById("outputArea");
  const errorAlert = document.getElementById("errorAlert");
  const loadingIndicator = document.getElementById("loadingIndicator"); // Add a loading indicator element if desired

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
  if (loadingIndicator) loadingIndicator.style.display = "block"; // Show loading
  convertBtn.disabled = true; // Disable button while loading
  dateTimeInput.disabled = true;

  timezoneData = await loadTimezoneData();

  if (loadingIndicator) loadingIndicator.style.display = "none"; // Hide loading
  if (timezoneData) {
    convertBtn.disabled = false; // Enable button if data loaded
    dateTimeInput.disabled = false;
    dateTimeInput.placeholder =
      "e.g., 14:30 UTC, 2 PM EST, 4.00 @ 10/5/2025 CDT, 2025-05-03T10:00Z";
  } else {
    errorAlert.textContent =
      "Failed to load timezone data. DST features disabled.";
    errorAlert.classList.remove("d-none");
    // Keep button disabled or handle fallback
    dateTimeInput.placeholder = "Error loading data...";
  }

  // --- Event Listener for Conversion ---
  convertBtn.addEventListener("click", () => {
    if (!timezoneData) {
      alert("Timezone data not loaded. Cannot perform conversion.");
      return;
    }

    if (relativeTimeIntervalId) {
      clearInterval(relativeTimeIntervalId);
      relativeTimeIntervalId = null;
      debugLog("Cleared previous relative time interval.");
    }

    const inputStr = dateTimeInput.value;
    if (!inputStr) {
      errorAlert.textContent = "Please enter a date/time value.";
      errorAlert.classList.remove("d-none");
      outputArea.classList.add("d-none");
      return;
    }

    debugLog("--- Starting Conversion ---");
    debugLog("Input:", inputStr);
    // Pass loaded data to the parser
    const parsedDate = parseDateTime(inputStr, timezoneData);
    debugLog("Parsed Date Object:", parsedDate);

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      debugLog("Formatting valid date...");
      const formattedResults = formatDateTime(parsedDate); // Use formatter module
      debugLog("Formatted Results:", formattedResults);

      let hasError = false;
      for (const key in outputFields) {
        if (
          outputFields.hasOwnProperty(key) &&
          formattedResults.hasOwnProperty(key)
        ) {
          const field = outputFields[key];
          const result = formattedResults[key];
          if (result.display === "Error") hasError = true;
          field.value = result.display;
          field.dataset.copyValue = result.copy;
        } else if (outputFields.hasOwnProperty(key)) {
          outputFields[key].value = "N/A";
          outputFields[key].dataset.copyValue = "N/A";
        }
      }

      if (hasError) {
        debugLog("Error occurred during formatting step.");
        errorAlert.textContent =
          "An error occurred while formatting the date.";
        errorAlert.classList.remove("d-none");
        outputArea.classList.add("d-none");
        return;
      }

      const relativeOutputElement = outputFields.relative;
      if (relativeOutputElement) {
        relativeTimeIntervalId = setInterval(() => {
          if (
            document.body.contains(relativeOutputElement) &&
            parsedDate &&
            !isNaN(parsedDate.getTime())
          ) {
            const currentRelativeString = getRelativeTime(parsedDate); // Use formatter module
            relativeOutputElement.value = currentRelativeString;
            relativeOutputElement.dataset.copyValue = `<t:${Math.floor(
              parsedDate.getTime() / 1000,
            )}:R>`;
          } else {
            clearInterval(relativeTimeIntervalId);
            relativeTimeIntervalId = null;
            debugLog(
              "Relative output element removed or date invalid, clearing interval.",
            );
          }
        }, 1000);
        debugLog("Started relative time interval:", relativeTimeIntervalId);
      }

      outputArea.classList.remove("d-none");
      errorAlert.classList.add("d-none");
    } else {
      debugLog("Parsing failed or resulted in invalid date.");
      for (const key in outputFields) {
        if (outputFields.hasOwnProperty(key)) {
          outputFields[key].value = "";
          delete outputFields[key].dataset.copyValue;
        }
      }
      errorAlert.textContent =
        "Invalid date/time format or unknown timezone. Try '14:30 UTC', '2 PM EST', '4.00 @ 10/5/2025 CDT', '2025-05-03T10:00Z'.";
      errorAlert.classList.remove("d-none");
      outputArea.classList.add("d-none");
    }
    debugLog("--- Conversion Finished ---");
  });

  // --- Copy Button Listeners (Keep existing logic) ---
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
          // Add visual feedback similar to above if desired
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

  // --- Enter Key Listener (Keep existing logic) ---
  dateTimeInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      convertBtn.click();
    }
  });
}); // End DOMContentLoaded
