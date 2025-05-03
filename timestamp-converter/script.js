document.addEventListener("DOMContentLoaded", () => {
  const dateTimeInput = document.getElementById("dateTimeInput");
  const convertBtn = document.getElementById("convertBtn");
  const outputArea = document.getElementById("outputArea");
  const errorAlert = document.getElementById("errorAlert");

  // Output fields mapping
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

  // Variable to store the interval ID for relative time updates
  let relativeTimeIntervalId = null;

  // Hardcoded Standard Timezone Offsets (Hours from UTC)
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
  

  // --- Main Parsing Function (Stricter Native Check) ---
  function parseDateTime(inputStr) {
    inputStr = inputStr.trim();
    let parsedDate = null;

    // --- Attempt 1: Native Date Parsing (ONLY for full ISO8601 with offset/Z) ---
    // Examples: 2025-05-03T13:30:00Z, 2025-05-03T10:30:00-03:00, 2025-05-03T15:30:00+0200
    const isoWithOffsetRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i;
    if (isoWithOffsetRegex.test(inputStr)) {
        try {
            const potentialDate = new Date(inputStr);
            if (!isNaN(potentialDate.getTime())) {
                const year = potentialDate.getFullYear();
                if (year > 1900 && year < 3000) {
                    console.log("Parser: Used native Date() constructor for ISO8601 w/ Offset/Z.");
                    return potentialDate;
                }
            }
        } catch (e) { /* Ignore native parsing errors */ }
    }

    // --- Attempt 2: Custom Parsing for "Time @ D/M/Y" ---
    const europeanDateTimeMatch = inputStr.match(/^(.*?)\s*@\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})$/i);
    if (europeanDateTimeMatch) {
      console.log("Parser: Matched Time @ D/M/Y format.");
      const timePartStr = europeanDateTimeMatch[1].trim();
      const datePartStr = europeanDateTimeMatch[2];
      parsedDate = parseEuropeanDateAndTime(datePartStr, timePartStr);
      if (parsedDate) return parsedDate;
    }

    // --- Attempt 3: Time-only formats (apply to today) ---
    if (!parsedDate) {
      console.log("Parser: Attempting time-only format.");
      parsedDate = parseTimeOnly(inputStr);
      if (parsedDate) return parsedDate;
    }

    // --- Fallback ---
    console.log("Parser: All parsing attempts failed.");
    return null; // Could not parse
  }

  // --- Helper: Parse European Date + Time Part ---
  function parseEuropeanDateAndTime(dateStr, timeStr) {
    const dateParts = dateStr.split(/[./-]/);
    if (dateParts.length !== 3) return null;
    const day = parseInt(dateParts[0], 10); const month = parseInt(dateParts[1], 10) - 1; const year = parseInt(dateParts[2], 10);
    const tempDateCheck = new Date(Date.UTC(year, month, day));
    if ( isNaN(tempDateCheck.getTime()) || tempDateCheck.getUTCFullYear() !== year || tempDateCheck.getUTCMonth() !== month || tempDateCheck.getUTCDate() !== day ) return null;
    const timeResult = parseTimeComponents(timeStr); // Use updated parser
    if (!timeResult) return null;
    const { hours, minutes, seconds, offsetInfo } = timeResult; // Get offsetInfo
    return constructDate( year, month, day, hours, minutes, seconds, offsetInfo ); // Pass offsetInfo
  }

  // --- Helper: Parse Time-Only (Apply to Today) ---
  function parseTimeOnly(timeStr) {
    const timeResult = parseTimeComponents(timeStr); // Use updated parser
    if (!timeResult) return null;
    const { hours, minutes, seconds, offsetInfo } = timeResult; // Get offsetInfo
    const today = new Date(); const year = today.getUTCFullYear(); const month = today.getUTCMonth(); const day = today.getUTCDate();
    return constructDate( year, month, day, hours, minutes, seconds, offsetInfo ); // Pass offsetInfo
  }

  // --- Helper: Parse Time String into Components (REVISED for Combined TZN/Offset) ---
   function parseTimeComponents(timeStr) {
    timeStr = timeStr.toUpperCase().trim();
    console.log("Parsing time components for:", timeStr);
    let hours = 0, minutes = 0, seconds = 0;
    let offsetInfo = null; // Default: assume local time

    // Regex V1: Match H:M[:S] or H.M[:S] at the start
    const timeHMS_Regex = /^(\d{1,2})([:.])(\d{2})(?:\\2(\d{2}))?/;
    // Regex V2: Match H AM/PM or HH AM/PM at the start
    const timeH_AmPm_Regex = /^(\d{1,2})\s*(AM|PM)$/;

    let timeMatch = timeStr.match(timeHMS_Regex);
    let amPmOnlyMatch = !timeMatch ? timeStr.match(timeH_AmPm_Regex) : null;

    let coreTimeLength = 0;

    if (timeMatch) {
        coreTimeLength = timeMatch[0].length;
        hours = parseInt(timeMatch[1], 10); minutes = parseInt(timeMatch[3], 10); seconds = timeMatch[4] ? parseInt(timeMatch[4], 10) : 0;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) { console.error("Invalid HMS components"); return null; }
    } else if (amPmOnlyMatch) {
        coreTimeLength = amPmOnlyMatch[0].length;
        hours = parseInt(amPmOnlyMatch[1], 10); const isPM = amPmOnlyMatch[2] === "PM"; minutes = 0; seconds = 0;
        if (hours < 1 || hours > 12) { console.error("Invalid H for AM/PM"); return null; }
        if (isPM && hours !== 12) hours += 12; else if (!isPM && hours === 12) hours = 0;
        offsetInfo = null; // This format implies local time
    } else { console.error("No core time pattern matched."); return null; }

    // --- Analyze the part AFTER the core time ---
    let remainingStr = timeStr.substring(coreTimeLength).trim();
    console.log(`Remainder after core time: "${remainingStr}"`);

    let baseOffsetHours = 0; // Start with UTC as base if no standard TZN found
    let standardTznFound = false;

    // Check for Standard TZN at the beginning of the remainder
    for (const tzn in standardTzOffsets) {
        if (remainingStr.startsWith(tzn)) {
            baseOffsetHours = standardTzOffsets[tzn];
            remainingStr = remainingStr.substring(tzn.length).trim(); // Remove TZN
            standardTznFound = true;
            console.log(`Found standard TZN: ${tzn}, Base Offset: ${baseOffsetHours}, New Remainder: "${remainingStr}"`);
            break; // Found one, stop looking
        }
    }

    // Now check the (potentially modified) remainder for explicit offset, UTC, AM/PM etc.
    let explicitOffsetHours = 0;
    let explicitOffsetMinutes = 0;
    let explicitOffsetFound = false;

    if (remainingStr) {
        const explicitOffsetRegex = /^(?:UTC|GMT)?([+-])(\d{1,2})(?::?(\d{2}))?$/;
        const explicitOffsetMatch = remainingStr.match(explicitOffsetRegex);
        const hhmmOffsetRegex = /^[+-]\d{4}$/;
        const hhmmOffsetMatch = !explicitOffsetMatch && remainingStr.match(hhmmOffsetRegex);

        if (explicitOffsetMatch) {
            const sign = explicitOffsetMatch[1] === '+' ? 1 : -1;
            explicitOffsetHours = sign * parseInt(explicitOffsetMatch[2], 10);
            explicitOffsetMinutes = sign * (explicitOffsetMatch[3] ? parseInt(explicitOffsetMatch[3], 10) : 0);
            if (Math.abs(explicitOffsetHours) > 14 || Math.abs(explicitOffsetMinutes) > 59) { console.error("Invalid explicit offset values"); return null; }
            explicitOffsetFound = true;
            console.log("Remainder matched explicit offset:", { H: explicitOffsetHours, M: explicitOffsetMinutes });
        } else if (hhmmOffsetMatch) {
            const sign = remainingStr[0] === '+' ? 1 : -1;
            explicitOffsetHours = sign * parseInt(remainingStr.substring(1, 3), 10);
            explicitOffsetMinutes = sign * parseInt(remainingStr.substring(3, 5), 10);
            if (Math.abs(explicitOffsetHours) > 14 || Math.abs(explicitOffsetMinutes) > 59) { console.error("Invalid HHMM offset values"); return null; }
            explicitOffsetFound = true;
            console.log("Remainder matched HHMM offset:", { H: explicitOffsetHours, M: explicitOffsetMinutes });
        } else if (!standardTznFound && (remainingStr === 'Z' || remainingStr === 'UTC' || remainingStr === 'GMT')) {
            // Only treat as UTC if no standard TZN was found before it
            offsetInfo = { type: 'utc' };
            console.log("Remainder matched UTC/GMT/Z");
        } else if (!standardTznFound && !explicitOffsetFound && (remainingStr === 'AM' || remainingStr === 'PM')) {
            // Handle AM/PM following H:M:S only if no TZN/Offset was found
            if (!timeMatch) { console.error("AM/PM found but not after H:M:S"); return null; }
            const isPM = remainingStr === "PM";
            if (hours < 1 || hours > 12) { console.error(`Hour ${hours} invalid for AM/PM after H:M:S`); return null; }
            if (isPM && hours !== 12) hours += 12; else if (!isPM && hours === 12) hours = 0;
            offsetInfo = null; // AM/PM implies local
            console.log(`Remainder matched AM/PM after H:M:S, adjusted H=${hours}, assuming local.`);
        } else if (remainingStr !== "") {
             // If there's still something left that wasn't parsed as TZN or Offset
             console.warn(`Unrecognized trailing string: "${remainingStr}". Ignoring.`);
             // Keep existing offsetInfo (might be from standard TZN or null)
        }
    }

    // --- Determine final offsetInfo ---
    if (offsetInfo?.type === 'utc') {
        // Already set as UTC
    } else if (standardTznFound || explicitOffsetFound) {
        // Combine base (from TZN, defaults to 0) and explicit offsets
        const finalOffsetHours = baseOffsetHours + explicitOffsetHours;
        const finalOffsetMinutes = explicitOffsetMinutes; // Explicit minutes override base
        // Basic validation for combined offset
        if (Math.abs(finalOffsetHours) > 14 || Math.abs(finalOffsetMinutes) > 59) {
             console.error(`Resulting combined offset H:${finalOffsetHours} M:${finalOffsetMinutes} is invalid.`);
             return null;
        }
        const totalMinutes = (finalOffsetHours * 60) + finalOffsetMinutes;
        offsetInfo = { type: 'offset', totalMinutes: totalMinutes };
        console.log("Final combined offset info:", offsetInfo);
    }
    // Else: offsetInfo remains null (local time)

    // Final validation on potentially adjusted hours
     if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        console.error(`Final time validation failed: H=${hours} M=${minutes} S=${seconds}`);
        return null;
    }

    console.log("parseTimeComponents successful:", { hours, minutes, seconds, offsetInfo });
    return { hours, minutes, seconds, offsetInfo };
  }

  // --- Helper: Construct Date Object from Components and Timezone (REVISED) ---
  function constructDate( year, month, day, hours, minutes, seconds, offsetInfo ) {
    let finalDate;
    console.log("Constructing date with:", { year, month, day, hours, minutes, seconds, offsetInfo });

    try {
        if (offsetInfo?.type === 'offset') {
            // Explicit or combined offset provided (offset is total minutes from UTC)
            const totalOffsetMinutes = offsetInfo.totalMinutes;
            const timestampInputZone = Date.UTC(year, month, day, hours, minutes, seconds, 0);
            if (isNaN(timestampInputZone)) throw new Error("Intermediate UTC timestamp is NaN");
            const targetUTCTimestamp = timestampInputZone - (totalOffsetMinutes * 60 * 1000);
            finalDate = new Date(targetUTCTimestamp);
            console.log(`Offset Calculation: Input TS ${timestampInputZone}, Offset Min ${totalOffsetMinutes}, Target UTC TS ${targetUTCTimestamp}`);

        } else if (offsetInfo?.type === 'utc') {
            // Explicit UTC/GMT/Z
            finalDate = new Date( Date.UTC(year, month, day, hours, minutes, seconds, 0) );
            console.log("Constructed as UTC");

        } else {
            // Assume LOCAL time (offsetInfo is null)
            finalDate = new Date(year, month, day, hours, minutes, seconds, 0);
            console.log("Constructed as Local Time");
        }

        // Final validation
        if (isNaN(finalDate.getTime())) {
          throw new Error("Constructed date resulted in NaN");
        }
        console.log("Constructed Date:", finalDate.toISOString());
        return finalDate;

    } catch (error) {
        console.error("Error during date construction:", error);
        return null; // Return null if construction fails
    }
  }


  // --- Formatting Logic (Unchanged) ---
  function formatDateTime(date) {
    if (!date || isNaN(date.getTime())) { console.error("Invalid date passed to formatDateTime:", date); return Object.keys(outputFields).reduce((acc, key) => { acc[key] = { display: "Error", copy: "Error" }; return acc; }, {}); }
    const locale = undefined; const timestamp = Math.floor(date.getTime() / 1000);
     if (isNaN(timestamp)) { console.error("Calculated timestamp is NaN in formatDateTime"); return Object.keys(outputFields).reduce((acc, key) => { acc[key] = { display: "Error", copy: "Error" }; return acc; }, {}); }
    const previewOptions = { t: { timeStyle: "short" }, T: { timeStyle: "medium" }, d: { dateStyle: "short" }, D: { dateStyle: "long" }, f: { dateStyle: "long", timeStyle: "short" }, F: { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" }, R: {} };
    try {
      const discordFormats = { t: `<t:${timestamp}:t>`, T: `<t:${timestamp}:T>`, d: `<t:${timestamp}:d>`, D: `<t:${timestamp}:D>`, f: `<t:${timestamp}:f>`, F: `<t:${timestamp}:F>`, R: `<t:${timestamp}:R>` };
      const displayFormats = { t: new Intl.DateTimeFormat(locale, previewOptions.t).format(date), T: new Intl.DateTimeFormat(locale, previewOptions.T).format(date), d: new Intl.DateTimeFormat(locale, previewOptions.d).format(date), D: new Intl.DateTimeFormat(locale, previewOptions.D).format(date), f: new Intl.DateTimeFormat(locale, previewOptions.f).format(date), F: new Intl.DateTimeFormat(locale, previewOptions.F).format(date), R: getRelativeTime(date) };
      return { unixTimestamp: { display: timestamp, copy: timestamp }, shortTime: { display: displayFormats.t, copy: discordFormats.t }, longTime: { display: displayFormats.T, copy: discordFormats.T }, shortDate: { display: displayFormats.d, copy: discordFormats.d }, longDate: { display: displayFormats.D, copy: discordFormats.D }, longDateShortTime: { display: displayFormats.f, copy: discordFormats.f }, longDateDayShortTime: { display: displayFormats.F, copy: discordFormats.F }, relative: { display: displayFormats.R, copy: discordFormats.R } };
    } catch (error) { console.error("Error formatting date:", error); return Object.keys(outputFields).reduce((acc, key) => { acc[key] = { display: "Error", copy: "Error" }; return acc; }, {}); }
  }

  // --- Relative Time Logic (Unchanged) ---
  function getRelativeTime(date) {
     if (!date || isNaN(date.getTime())) return "Invalid Date";
    const now = new Date(); const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
    if ("RelativeTimeFormat" in Intl) { const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }); const absSeconds = Math.abs(diffSeconds); if (absSeconds < 60) return rtf.format(diffSeconds, "second"); const diffMinutes = Math.round(diffSeconds / 60); if (absSeconds < 3600) return rtf.format(diffMinutes, "minute"); const diffHours = Math.round(diffMinutes / 60); if (absSeconds < 86400) return rtf.format(diffHours, "hour"); const diffDays = Math.round(diffHours / 24); if (absSeconds < 2592000) return rtf.format(diffDays, "day"); const diffMonths = Math.round(diffDays / 30.44); if (absSeconds < 31536000) return rtf.format(diffMonths, "month"); const diffYears = Math.round(diffDays / 365.25); return rtf.format(diffYears, "year"); }
    else { /* Fallback */ if (diffSeconds === 0) return "just now"; const tense = diffSeconds < 0 ? "ago" : "from now"; const absSeconds = Math.abs(diffSeconds); if (absSeconds < 60) return `${absSeconds} seconds ${tense}`; const minutes = Math.round(absSeconds / 60); if (minutes < 60) return `${minutes} minutes ${tense}`; const hours = Math.round(minutes / 60); if (hours < 24) return `${hours} hours ${tense}`; const days = Math.round(hours / 24); return `${days} days ${tense}`; }
  }

  // --- Event Listeners (Unchanged structure, updated error/placeholder text) ---
  convertBtn.addEventListener("click", () => {
    if (relativeTimeIntervalId) { clearInterval(relativeTimeIntervalId); relativeTimeIntervalId = null; console.log("Cleared previous relative time interval."); }
    const inputStr = dateTimeInput.value;
    if (!inputStr) { errorAlert.textContent = "Please enter a date/time value."; errorAlert.classList.remove("d-none"); outputArea.classList.add("d-none"); return; }
    console.log("--- Starting Conversion ---");
    const parsedDate = parseDateTime(inputStr);
    console.log("Parsed Date Object:", parsedDate);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      console.log("Formatting valid date...");
      const formattedResults = formatDateTime(parsedDate);
      console.log("Formatted Results:", formattedResults);
      let hasError = false;
      for (const key in outputFields) { if ( outputFields.hasOwnProperty(key) && formattedResults.hasOwnProperty(key) ) { const field = outputFields[key]; const result = formattedResults[key]; if (result.display === "Error") hasError = true; field.value = result.display; field.dataset.copyValue = result.copy; } else if (outputFields.hasOwnProperty(key)) { outputFields[key].value = "N/A"; outputFields[key].dataset.copyValue = "N/A"; } }
      if (hasError) { console.error("Error occurred during formatting step."); errorAlert.textContent = "An error occurred while formatting the date."; errorAlert.classList.remove("d-none"); outputArea.classList.add("d-none"); return; }
      const relativeOutputElement = outputFields.relative;
      if (relativeOutputElement) { relativeTimeIntervalId = setInterval(() => { if (document.body.contains(relativeOutputElement) && parsedDate && !isNaN(parsedDate.getTime())) { const currentRelativeString = getRelativeTime(parsedDate); relativeOutputElement.value = currentRelativeString; } else { clearInterval(relativeTimeIntervalId); relativeTimeIntervalId = null; console.log("Relative output element removed or date invalid, clearing interval."); } }, 1000); console.log("Started relative time interval:", relativeTimeIntervalId); }
      outputArea.classList.remove("d-none"); errorAlert.classList.add("d-none");
    } else {
      console.error("Parsing failed or resulted in invalid date.");
      for (const key in outputFields) { if (outputFields.hasOwnProperty(key)) { outputFields[key].value = ""; delete outputFields[key].dataset.copyValue; } }
      errorAlert.textContent = "Could not parse date/time. Check format (e.g., '14:30 UTC+3', '2 PM', '10.00 CST+2 @ 3/5/2025', '2025-05-03T10:00:00-04:00')."; // Updated example
      errorAlert.classList.remove("d-none"); outputArea.classList.add("d-none");
    }
     console.log("--- Conversion Finished ---");
  });

  // Copy Button Listeners (Unchanged)
  document.querySelectorAll(".copy-btn").forEach((button) => { button.addEventListener("click", () => { const targetInputId = button.getAttribute("data-target"); const targetInput = document.getElementById(targetInputId); const valueToCopy = targetInput ? targetInput.dataset.copyValue : null; if (valueToCopy && valueToCopy !== "Error" && valueToCopy !== "N/A" && navigator.clipboard) { navigator.clipboard.writeText(valueToCopy).then(() => { const originalIcon = button.innerHTML; button.innerHTML = '<i class="bi bi-check-lg"></i> Copied!'; button.disabled = true; button.classList.add("btn-success"); button.classList.remove("btn-outline-secondary"); setTimeout(() => { button.innerHTML = originalIcon; button.disabled = false; button.classList.remove("btn-success"); button.classList.add("btn-outline-secondary"); }, 1500); }).catch((err) => { console.error("Failed to copy text: ", err); alert("Failed to copy. Please copy manually."); }); } else if (valueToCopy && valueToCopy !== "Error" && valueToCopy !== "N/A") { /* Fallback */ const tempTextArea = document.createElement("textarea"); tempTextArea.value = valueToCopy; tempTextArea.style.position = "absolute"; tempTextArea.style.left = "-9999px"; document.body.appendChild(tempTextArea); tempTextArea.select(); try { document.execCommand("copy"); } catch (err) { alert("Failed to copy. Please copy manually."); } finally { document.body.removeChild(tempTextArea); } } else { console.error("Could not find valid value to copy for target:", targetInputId); } }); });

  // Enter Key Listener (Unchanged)
  dateTimeInput.addEventListener("keypress", (event) => { if (event.key === "Enter") { event.preventDefault(); convertBtn.click(); } });

  // Placeholder Text (Updated)
  dateTimeInput.placeholder = "e.g., 14:30 UTC+3, 2 PM, 10.00 CST+2 @ 3/5/2025, 2025-05-03T10:00-0400";

}); // End DOMContentLoaded
