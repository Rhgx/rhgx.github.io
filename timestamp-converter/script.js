document.addEventListener("DOMContentLoaded", () => {
    const dateTimeInput = document.getElementById("dateTimeInput");
    const convertBtn = document.getElementById("convertBtn");
    const outputArea = document.getElementById("outputArea");
    const errorAlert = document.getElementById("errorAlert");
  
    // Output fields mapping (IDs must match HTML)
    const outputFields = {
      unixTimestamp: document.getElementById("unixTimestampOutput"),
      shortTime: document.getElementById("shortTimeOutput"), // t
      longTime: document.getElementById("longTimeOutput"), // T
      shortDate: document.getElementById("shortDateOutput"), // d
      longDate: document.getElementById("longDateOutput"), // D
      longDateShortTime: document.getElementById("longDateShortTimeOutput"), // f
      longDateDayShortTime: document.getElementById(
        "longDateDayShortTimeOutput",
      ), // F
      relative: document.getElementById("relativeOutput"), // R
    };
  
    // Hardcoded Standard Timezone Offsets (No DST Handling!)
    const standardTzOffsets = {
        ACDT: 10.5, // Australian Central Daylight Time (UTC+10:30)
        ACST: 9.5, // Australian Central Standard Time (UTC+09:30)
        ACT: 8, // ASEAN Common Time (UTC+08)
        ADT: -3, // Atlantic Daylight Time (UTC-3)
        AEDT: 11, // Australian Eastern Daylight Time (UTC+11)
        AEST: 10, // Australian Eastern Standard Time (UTC+10)
        AFT: 4.5, // Afghanistan Time (UTC+04:30)
        AKDT: -8, // Alaska Daylight Time (UTC-8)
        AKST: -9, // Alaska Standard Time (UTC-9)
        ALMT: 6, // Almaty Time (UTC+06)
        AMST: -2, // Amazon Summer Time (UTC-2)
        AMT: -4, // Amazon Time (UTC-4)
        ANAST: 12, // Anadyr Summer Time (UTC+12)
        ANAT: 12, // Anadyr Time (UTC+12)
        AQTT: 5, // Aqtobe Time (UTC+05)
        ART: -3, // Argentina Time (UTC-3)
        AST: -4, // Atlantic Standard Time (UTC-4)
        AT: -4, // Atlantic Time (UTC-4)
        AWDT: 9, // Australian Western Daylight Time (UTC+09)
        AWST: 8, // Australian Western Standard Time (UTC+08)
        AZOST: 0, // Azores Summer Time (UTC+0)
        AZOT: -1, // Azores Standard Time (UTC-1)
        AZST: 5, // Azerbaijan Summer Time (UTC+05)
        AZT: 4, // Azerbaijan Time (UTC+04)
        BDT: 6, // Bangladesh Daylight Time (UTC+06)
        BIOT: 6, // British Indian Ocean Time (UTC+06)
        BIT: -12, // Baker Island Time (UTC-12)
        BOT: -4, // Bolivia Time (UTC-4)
        BRST: -2, // Brasilia Summer Time (UTC-2)
        BRT: -3, // Brasilia Time (UTC-3)
        BST: 1, // British Summer Time (UTC+1)
        BTT: 6, // Bhutan Time (UTC+06)
        CAT: 2, // Central Africa Time (UTC+02)
        CCT: 6.5, // Cocos Islands Time (UTC+06:30)
        CDT: -5, // Central Daylight Time (UTC-5)
        CEST: 2, // Central European Summer Time (UTC+2)
        CET: 1, // Central European Time (UTC+1)
        CHADT: 13.75, // Chatham Daylight Time (UTC+13:45)
        CHAST: 12.75, // Chatham Standard Time (UTC+12:45)
        CHOT: 8, // Choibalsan Time (UTC+08)
        CHOST: 9, // Choibalsan Summer Time (UTC+09)
        CHST: 10, // Chamorro Standard Time (UTC+10)
        CHUT: 10, // Chuuk Time (UTC+10)
        CIST: -8, // Clipperton Island Standard Time (UTC-08)
        CIT: 8, // Central Indonesian Time (UTC+08)
        CKT: -10, // Cook Islands Time (UTC-10)
        CLST: -3, // Chile Summer Time (UTC-3)
        CLT: -4, // Chile Standard Time (UTC-4)
        COST: -4, // Colombia Summer Time (UTC-4)
        COT: -5, // Colombia Time (UTC-5)
        CST: -6, // Central Standard Time (UTC-6)
        CT: 8, // China Time (UTC+08)
        CVT: -1, // Cape Verde Time (UTC-1)
        CWST: 8.75, // Central Western Standard Time (UTC+08:45)
        CXT: 7, // Christmas Island Time (UTC+07)
        DAVT: 7, // Davis Time (Antarctica) (UTC+07)
        DDUT: 10, // Dumont d'Urville Time (Antarctica) (UTC+10)
        EASST: -5, // Easter Island Summer Time (UTC-5)
        EAT: 3, // East Africa Time (UTC+03)
        ECT: -5, // Ecuador Time (UTC-5)
        EDT: -4, // Eastern Daylight Time (UTC-4)
        EEST: 3, // Eastern European Summer Time (UTC+3)
        EET: 2, // Eastern European Time (UTC+2)
        EGST: 0, // Eastern Greenland Summer Time (UTC+0)
        EGT: -1, // Eastern Greenland Time (UTC-1)
        EST: -5, // Eastern Standard Time (UTC-5)
        ET: -5, // Eastern Time (UTC-5)
        FET: 3, // Further-eastern European Time (UTC+03)
        FJT: 12, // Fiji Time (UTC+12)
        FKST: -3, // Falkland Islands Summer Time (UTC-3)
        FKT: -4, // Falkland Islands Time (UTC-4)
        FNT: -2, // Fernando de Noronha Time (UTC-02)
        GALT: -6, // Galapagos Time (UTC-6)
        GAMT: -9, // Gambier Islands Time (UTC-09)
        GET: 4, // Georgia Standard Time (UTC+04)
        GFT: -3, // French Guiana Time (UTC-3)
        GILT: 12, // Gilbert Islands Time (UTC+12)
        GIT: -9, // Gambier Island Time (UTC-9)
        GMT: 0, // Greenwich Mean Time (UTC+0)
        GST: 4, // Gulf Standard Time (UTC+04)
        GYT: -4, // Guyana Time (UTC-4)
        HDT: -9, // Hawaii-Aleutian Daylight Time (UTC-9)
        HKT: 8, // Hong Kong Time (UTC+08)
        HOVST: 8, // Hovd Summer Time (UTC+08)
        HOVT: 7, // Hovd Time (UTC+07)
        HST: -10, // Hawaii Standard Time (UTC-10)
        ICT: 7, // Indochina Time (UTC+07)
        IDT: 3, // Israel Daylight Time (UTC+03)
        IOT: 3, // Indian Ocean Time (UTC+03)
        IRDT: 4.5, // Iran Daylight Time (UTC+04:30)
        IRKT: 8, // Irkutsk Time (UTC+08)
        IRT: 3.5, // Iran Standard Time (UTC+03:30)
        IST: 5.5, // Indian Standard Time (UTC+05:30)
        JST: 9, // Japan Standard Time (UTC+09)
        KALT: 2, // Kaliningrad Time (UTC+02)
        KGT: 6, // Kyrgyzstan Time (UTC+06)
        KOST: 11, // Kosrae Time (UTC+11)
        KRAT: 7, // Krasnoyarsk Time (UTC+07)
        KST: 9, // Korea Standard Time (UTC+09)
        KUYT: 4, // Kuybyshev Time (UTC+04)
        LHDT: 11, // Lord Howe Daylight Time (UTC+11)
        LHST: 10.5, // Lord Howe Standard Time (UTC+10:30)
        LINT: 14, // Line Islands Time (UTC+14)
        MAGT: 12, // Magadan Time (UTC+12)
        MART: -9.5, // Marquesas Islands Time (UTC-09:30)
        MAWT: 5, // Mawson Time (Antarctica) (UTC+05)
        MDT: -6, // Mountain Daylight Time (UTC-6)
        MEST: 2, // Middle European Summer Time (UTC+2)
        MET: 1, // Middle European Time (UTC+1)
        MHT: 12, // Marshall Islands Time (UTC+12)
        MIST: 11, // Macquarie Island Station Time (UTC+11)
        MIT: -9.5, // Marquesas Islands Time (UTC-09:30)
        MMT: 6.5, // Myanmar Time (UTC+06:30)
        MSD: 4, // Moscow Daylight Time (UTC+04)
        MSK: 3, // Moscow Standard Time (UTC+03)
        MST: -7, // Mountain Standard Time (UTC-7)
        MT: -7, // Mountain Time (UTC-7)
        MUT: 4, // Mauritius Time (UTC+04)
        MVT: 5, // Maldives Time (UTC+05)
        MYT: 8, // Malaysia Time (UTC+08)
        NCT: 11, // New Caledonia Time (UTC+11)
        NDT: -2.5, // Newfoundland Daylight Time (UTC-02:30)
        NFT: -3.5, // Newfoundland Time (UTC-03:30)
        NOVST: 7, // Novosibirsk Summer Time (UTC+07)
        NOVT: 6, // Novosibirsk Time (UTC+06)
        NPT: 5.75, // Nepal Time (UTC+05:45)
        NRT: 11, // Nauru Time (UTC+12)
        NST: -3.5, // Newfoundland Standard Time (UTC-03:30)
        NUT: -11, // Niue Time (UTC-11)
        NZDT: 13, // New Zealand Daylight Time (UTC+13)
        NZST: 12, // New Zealand Standard Time (UTC+12)
        OMSST: 7, // Omsk Summer Time (UTC+07)
        OMST: 6, // Omsk Standard Time (UTC+06)
        ORAT: 5, // Oral Time (UTC+05)
        PDT: -7, // Pacific Daylight Time (UTC-7)
        PET: -5, // Peru Time (UTC-5)
        PETST: 12, // Petropavlovsk-Kamchatski Summer Time (UTC+12)
        PETT: 12, // Petropavlovsk-Kamchatski Time (UTC+12)
        PGT: 10, // Papua New Guinea Time (UTC+10)
        PHOT: 13, // Phoenix Islands Time (UTC+13)
        PHT: 8, // Philippine Time (UTC+08)
        PKT: 5, // Pakistan Standard Time (UTC+05)
        PMDT: -2, // Saint Pierre and Miquelon Daylight time (UTC-02)
        PMST: -3, // Saint Pierre and Miquelon Standard Time (UTC-03)
        PONT: 11, // Pohnpei Standard Time (UTC+11)
        PST: -8, // Pacific Standard Time (UTC-8)
        PT: -8, // Pacific Time (UTC-8)
        PYST: -3, // Paraguay Summer Time (UTC-3)
        PYT: -4, // Paraguay Time (UTC-4)
        QYZT: 6, // Qyzylorda Time (UTC+06)
        RET: 4, // Reunion Time (UTC+04)
        ROTT: -3, // Rothera Research Station Time (UTC-03)
        SAKT: 11, // Sakhalin Time (UTC+11)
        SAMT: 4, // Samara Time (UTC+04)
        SAST: 2, // South African Standard Time (UTC+02)
        SBT: 11, // Solomon Islands Time (UTC+11)
        SCT: 4, // Seychelles Time (UTC+04)
        SDT: -10, // Samoa Daylight Time (UTC-10)
        SGT: 8, // Singapore Time (UTC+08)
        SLST: 5.5, // Sri Lanka Standard Time (UTC+05:30)
        SRET: 11, // Srednekolymsk Time (UTC+11)
        SRT: -3, // Suriname Time (UTC-3)
        SST: -11, // Samoa Standard Time (UTC-11)
        SYOT: 3, // Syowa Time (Antarctica) (UTC+03)
        TAHT: -10, // Tahiti Time (UTC-10)
        TFT: 5, // French Southern and Antarctic Lands Time (UTC+05)
        TJT: 5, // Tajikistan Time (UTC+05)
        TKT: 13, // Tokelau Time (UTC+13)
        TLT: 9, // East Timor Time (UTC+09)
        TMT: 5, // Turkmenistan Time (UTC+05)
        TRT: 3, // Turkey Time (UTC+03)
        TOT: 13, // Tonga Time (UTC+13)
        TVT: 12, // Tuvalu Time (UTC+12)
        ULAST: 9, // Ulaanbaatar Summer Time (UTC+09)
        ULAT: 8, // Ulaanbaatar Time (UTC+08)
        UTC: 0, // Coordinated Universal Time (UTC+0)
        UYST: -2, // Uruguay Summer Time (UTC-2)
        UYT: -3, // Uruguay Time (UTC-3)
        UZT: 5, // Uzbekistan Time (UTC+05)
        VET: -4, // Venezuelan Standard Time (UTC-04)
        VLAT: 10, // Vladivostok Time (UTC+10)
        VOLT: 4, // Volgograd Time (UTC+04)
        VOST: 6, // Vostok Time (Antarctica) (UTC+06)
        VUT: 11, // Vanuatu Time (UTC+11)
        WAKT: 12, // Wake Island Time (UTC+12)
        WARST: -3, // Warshaw Summer Time (UTC-3)
        WAST: 2, // West Africa Summer Time (UTC+02)
        WAT: 1, // West Africa Time (UTC+01)
        WEST: 1, // Western European Summer Time (UTC+1)
        WET: 0, // Western European Time (UTC+0)
        WIB: 7, // Western Indonesian Time (UTC+07)
        WIT: 9, // Eastern Indonesian Time (UTC+09)
        WITA: 8, // Central Indonesian Time (UTC+08)
        WGST: -2, // Western Greenland Summer Time (UTC-2)
        WGT: -3, // Western Greenland Time (UTC-3)
        WST: 8, // Western Standard Time (UTC+08)
        YAKT: 9, // Yakutsk Time (UTC+09)
        YEKT: 5, // Yekaterinburg Time (UTC+05)
      };
      
  
    // --- Main Parsing Function (Unchanged from previous version) ---
    function parseDateTime(inputStr) {
      inputStr = inputStr.trim();
      let parsedDate = null;
  
      // Attempt 1: Native Date Parsing
      try {
        const potentialDate = new Date(inputStr);
        if (!isNaN(potentialDate.getTime())) {
          const year = potentialDate.getFullYear();
          if (year > 1900 && year < 3000) {
            const likelyDateChars = /[/-]|(@)|(^\d{4})/;
            if (
              likelyDateChars.test(inputStr) ||
              potentialDate.getFullYear() >= 1971
            ) {
              console.log("Parser: Used native Date() constructor.");
              return potentialDate;
            } else {
              console.log(
                "Parser: Native Date() resulted in old date for time-like input, trying custom.",
              );
            }
          }
        }
      } catch (e) { /* Ignore */ }
  
      // Attempt 2: Custom Parsing for "Time @ D/M/Y"
      const europeanDateTimeMatch = inputStr.match(
        /^(.*?)\s*@\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})$/i,
      );
      if (europeanDateTimeMatch) {
        console.log("Parser: Matched Time @ D/M/Y format.");
        const timePartStr = europeanDateTimeMatch[1].trim();
        const datePartStr = europeanDateTimeMatch[2];
        parsedDate = parseEuropeanDateAndTime(datePartStr, timePartStr);
        if (parsedDate) return parsedDate;
      }
  
      // Attempt 3: Time-only formats (apply to today)
      if (!parsedDate) {
        console.log("Parser: Attempting time-only format.");
        parsedDate = parseTimeOnly(inputStr);
        if (parsedDate) return parsedDate;
      }
  
      // Fallback
      console.log("Parser: All parsing attempts failed.");
      return null;
    }
  
    // --- Helper: Parse European Date + Time Part (Unchanged) ---
    function parseEuropeanDateAndTime(dateStr, timeStr) {
      const dateParts = dateStr.split(/[./-]/);
      if (dateParts.length !== 3) return null;
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const year = parseInt(dateParts[2], 10);
      const tempDateCheck = new Date(Date.UTC(year, month, day));
      if (
        isNaN(tempDateCheck.getTime()) ||
        tempDateCheck.getUTCFullYear() !== year ||
        tempDateCheck.getUTCMonth() !== month ||
        tempDateCheck.getUTCDate() !== day
      ) {
        return null;
      }
      const timeResult = parseTimeComponents(timeStr);
      if (!timeResult) return null;
      const { hours, minutes, seconds, timeZoneStr } = timeResult;
      return constructDate(
        year,
        month,
        day,
        hours,
        minutes,
        seconds,
        timeZoneStr,
      );
    }
  
    // --- Helper: Parse Time-Only (Apply to Today) (Unchanged) ---
    function parseTimeOnly(timeStr) {
      const timeResult = parseTimeComponents(timeStr);
      if (!timeResult) return null;
      const { hours, minutes, seconds, timeZoneStr } = timeResult;
      const today = new Date();
      const year = today.getUTCFullYear();
      const month = today.getUTCMonth();
      const day = today.getUTCDate();
      return constructDate(
        year,
        month,
        day,
        hours,
        minutes,
        seconds,
        timeZoneStr,
      );
    }
  
    // --- Helper: Parse Time String into Components (Handles : and .) (Unchanged) ---
    function parseTimeComponents(timeStr) {
        timeStr = timeStr.toUpperCase().trim(); // Trim whitespace
        let hours = 0,
          minutes = 0,
          seconds = 0,
          timeZoneStr = null;
        let isAmPmFormat = false;
        let isPM = false;
    
        // --- Try Pattern 1: H/HH [:/.] MM [[:/.] SS] [TZN/AM/PM] ---
        // Regex: (H/HH) ([/:.]) (MM) [ optionally \\2 (SS) ]
        const timePatternRegex = /^(\d{1,2})([:.])(\d{2})(?:\\2(\d{2}))?/;
        const timeMatch = timeStr.match(timePatternRegex);
    
        if (timeMatch) {
          // Matched H:M or H.M pattern
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[3], 10);
          seconds = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;
    
          // Check what follows the time pattern
          const remainingStr = timeStr.substring(timeMatch[0].length).trim();
    
          if (remainingStr === "AM" || remainingStr === "PM") {
            isAmPmFormat = true;
            isPM = remainingStr === "PM";
            timeZoneStr = null;
            if (hours < 1 || hours > 12) return null; // Validate AM/PM hours
            if (isPM && hours !== 12) hours += 12;
            else if (!isPM && hours === 12) hours = 0; // 12 AM
          } else if (/^[A-Z]+$/.test(remainingStr)) {
            isAmPmFormat = false;
            timeZoneStr = remainingStr;
            if (hours < 0 || hours > 23) return null; // Validate 24h hours
          } else if (remainingStr === "") {
            isAmPmFormat = false;
            timeZoneStr = null;
            if (hours < 0 || hours > 23) return null; // Validate 24h hours
          } else {
            return null; // Invalid characters after time
          }
        } else {
          // --- Try Pattern 2: H/HH AM/PM (No minutes/seconds) ---
          // Regex: (H/HH) (AM|PM)
          const hourAmPmRegex = /^(\d{1,2})\s*(AM|PM)$/;
          const hourAmPmMatch = timeStr.match(hourAmPmRegex);
    
          if (hourAmPmMatch) {
            hours = parseInt(hourAmPmMatch[1], 10);
            isPM = hourAmPmMatch[2] === "PM";
            minutes = 0; // Default minutes
            seconds = 0; // Default seconds
            isAmPmFormat = true;
            timeZoneStr = null; // AM/PM implies local
    
            if (hours < 1 || hours > 12) return null; // Validate AM/PM hours
    
            // Convert to 24-hour format
            if (isPM && hours !== 12) {
              hours += 12;
            } else if (!isPM && hours === 12) {
              // Handle 12 AM (midnight)
              hours = 0;
            }
          } else {
            // --- No recognized time pattern found ---
            return null;
          }
        }
    
        // Final validation for minutes and seconds (should be 0-59)
        // This check is still valid even if they were defaulted to 0
        if (minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
          return null;
        }
    
        // Return the parsed components
        return { hours, minutes, seconds, timeZoneStr };
      }
  
    // --- Helper: Construct Date Object from Components and Timezone (Unchanged) ---
    function constructDate( year, month, day, hours, minutes, seconds, timeZoneStr ) {
      let finalDate;
      const hardcodedOffset = standardTzOffsets[timeZoneStr];
      if (timeZoneStr === "UTC" || timeZoneStr === "GMT") {
        finalDate = new Date( Date.UTC(year, month, day, hours, minutes, seconds, 0) );
      } else if (hardcodedOffset !== undefined) {
        const targetHourUTC = hours - hardcodedOffset;
        finalDate = new Date( Date.UTC(year, month, day, targetHourUTC, minutes, seconds, 0) );
      } else {
        finalDate = new Date(year, month, day, hours, minutes, seconds, 0);
        if (timeZoneStr) console.warn( `Unrecognized timezone "${timeZoneStr}". Interpreting time as local. DST not handled.` );
      }
      if (isNaN(finalDate.getTime())) return null;
      return finalDate;
    }
  
    // --- Formatting Logic (UPDATED) ---
    function formatDateTime(date) {
      const locale = undefined; // Use browser default locale
      const timestamp = Math.floor(date.getTime() / 1000);
  
      // Options for generating human-readable previews
      const previewOptions = {
        t: { timeStyle: "short" }, // Short Time
        T: { timeStyle: "medium" }, // Long Time (use medium for H:M:S)
        d: { dateStyle: "short" }, // Short Date
        D: { dateStyle: "long" }, // Long Date
        f: { dateStyle: "long", timeStyle: "short" }, // Date & Time
        F: { // Date, Day & Time
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        },
        R: {}, // Relative time handled separately
      };
  
      try {
        // Generate Discord markdown strings
        const discordFormats = {
          t: `<t:${timestamp}:t>`,
          T: `<t:${timestamp}:T>`,
          d: `<t:${timestamp}:d>`,
          D: `<t:${timestamp}:D>`,
          f: `<t:${timestamp}:f>`,
          F: `<t:${timestamp}:F>`,
          R: `<t:${timestamp}:R>`,
        };
  
        // Generate human-readable previews
        const displayFormats = {
          t: new Intl.DateTimeFormat(locale, previewOptions.t).format(date),
          T: new Intl.DateTimeFormat(locale, previewOptions.T).format(date),
          d: new Intl.DateTimeFormat(locale, previewOptions.d).format(date),
          D: new Intl.DateTimeFormat(locale, previewOptions.D).format(date),
          f: new Intl.DateTimeFormat(locale, previewOptions.f).format(date),
          F: new Intl.DateTimeFormat(locale, previewOptions.F).format(date),
          R: getRelativeTime(date), // Use our existing relative time function
        };
  
        // Combine into the final structure
        return {
          unixTimestamp: { display: timestamp, copy: timestamp }, // Special case
          shortTime: { display: displayFormats.t, copy: discordFormats.t },
          longTime: { display: displayFormats.T, copy: discordFormats.T },
          shortDate: { display: displayFormats.d, copy: discordFormats.d },
          longDate: { display: displayFormats.D, copy: discordFormats.D },
          longDateShortTime: { display: displayFormats.f, copy: discordFormats.f },
          longDateDayShortTime: { display: displayFormats.F, copy: discordFormats.F },
          relative: { display: displayFormats.R, copy: discordFormats.R },
        };
  
      } catch (error) {
        console.error("Error formatting date:", error);
        // Return error state for all fields
        return Object.keys(outputFields).reduce((acc, key) => {
          acc[key] = { display: "Error", copy: "Error" };
          return acc;
        }, {});
      }
    }
  
    // --- Relative Time Logic (Unchanged) ---
    function getRelativeTime(date) {
      const now = new Date();
      const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
      if ("RelativeTimeFormat" in Intl) {
        const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
        const absSeconds = Math.abs(diffSeconds);
        if (absSeconds < 60) return rtf.format(diffSeconds, "second");
        const diffMinutes = Math.round(diffSeconds / 60);
        if (absSeconds < 3600) return rtf.format(diffMinutes, "minute");
        const diffHours = Math.round(diffMinutes / 60);
        if (absSeconds < 86400) return rtf.format(diffHours, "hour");
        const diffDays = Math.round(diffHours / 24);
        if (absSeconds < 2592000) return rtf.format(diffDays, "day");
        const diffMonths = Math.round(diffDays / 30.44);
        if (absSeconds < 31536000) return rtf.format(diffMonths, "month");
        const diffYears = Math.round(diffDays / 365.25);
        return rtf.format(diffYears, "year");
      } else { /* Basic fallback */
        if (diffSeconds === 0) return "just now";
        const tense = diffSeconds < 0 ? "ago" : "from now";
        const absSeconds = Math.abs(diffSeconds);
        if (absSeconds < 60) return `${absSeconds} seconds ${tense}`;
        const minutes = Math.round(absSeconds / 60);
        if (minutes < 60) return `${minutes} minutes ${tense}`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} hours ${tense}`;
        const days = Math.round(hours / 24);
        return `${days} days ${tense}`;
      }
    }
  
    // --- Event Listeners ---
    convertBtn.addEventListener("click", () => {
      const inputStr = dateTimeInput.value;
      if (!inputStr) {
        errorAlert.textContent = "Please enter a date/time value.";
        errorAlert.classList.remove("d-none");
        outputArea.classList.add("d-none");
        return;
      }
  
      const parsedDate = parseDateTime(inputStr);
  
      if (parsedDate) {
        const formattedResults = formatDateTime(parsedDate);
  
        // Populate output fields with display value and set data attribute for copy value
        for (const key in outputFields) {
          if (
            outputFields.hasOwnProperty(key) &&
            formattedResults.hasOwnProperty(key)
          ) {
            const field = outputFields[key];
            const result = formattedResults[key];
            field.value = result.display; // Show human-readable preview
            field.dataset.copyValue = result.copy; // Store Discord markdown for copying
          }
        }
        outputArea.classList.remove("d-none");
        errorAlert.classList.add("d-none");
      } else {
        // Clear previous results on error
        for (const key in outputFields) {
          if (outputFields.hasOwnProperty(key)) {
            outputFields[key].value = "";
            delete outputFields[key].dataset.copyValue; // Remove data attribute too
          }
        }
        errorAlert.textContent =
          "Could not parse date/time. Check format (e.g., '14:30', '14.30.15', '2:15 PM', '10.00 CST @ 3/5/2025', '2025-05-03T10:00Z').";
        errorAlert.classList.remove("d-none");
        outputArea.classList.add("d-none");
      }
    });
  
    // Add event listeners for all copy buttons (UPDATED)
    document.querySelectorAll(".copy-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const targetInputId = button.getAttribute("data-target");
        const targetInput = document.getElementById(targetInputId);
  
        // Read the value to copy from the data attribute
        const valueToCopy = targetInput ? targetInput.dataset.copyValue : null;
  
        if (valueToCopy && navigator.clipboard) {
          navigator.clipboard
            .writeText(valueToCopy) // Copy the Discord markdown string
            .then(() => {
              // Provide feedback
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
              console.error("Failed to copy text: ", err);
              alert("Failed to copy. Please copy manually.");
            });
        } else if (valueToCopy) {
          // Basic fallback (less likely needed, copies markdown)
          // Create a temporary textarea to copy from
          const tempTextArea = document.createElement("textarea");
          tempTextArea.value = valueToCopy;
          tempTextArea.style.position = "absolute";
          tempTextArea.style.left = "-9999px";
          document.body.appendChild(tempTextArea);
          tempTextArea.select();
          try {
            document.execCommand("copy");
            // Add similar visual feedback if desired for fallback
          } catch (err) {
            alert("Failed to copy. Please copy manually.");
          } finally {
            document.body.removeChild(tempTextArea);
          }
        } else {
          console.error("Could not find value to copy for target:", targetInputId);
        }
      });
    });
  
    // Optional: Allow pressing Enter in the input field to trigger conversion (Unchanged)
    dateTimeInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        convertBtn.click();
      }
    });
  
    // --- Update Placeholder Text on Load (Unchanged) ---
    dateTimeInput.placeholder =
      "e.g., 14:30, 14.30.15, 2:15 PM, 10.00 CST @ 3/5/2025, 2025-05-03T10:00Z";
  
  }); // End DOMContentLoaded
  