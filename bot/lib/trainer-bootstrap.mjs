function normalizeTrainerText(value = "") {
  return String(value || "").trim();
}

function normalizeTrainerKey(value = "") {
  return normalizeTrainerText(value).toLowerCase();
}

export function formatTrainerProfileDisplayName(profileKey = "") {
  const normalized = normalizeTrainerText(profileKey)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Trainer Character";
  }

  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function buildTrainerRoster(characterConfigs = []) {
  return (Array.isArray(characterConfigs) ? characterConfigs : [])
    .map((entry) => {
      const options = entry?.options && typeof entry.options === "object"
        ? entry.options
        : {};
      const routeName = normalizeTrainerText(options.cavebotName);
      const partnerName = normalizeTrainerText(options.trainerPartnerName);
      const trainerEnabled = options.trainerEnabled === true;
      if (!partnerName && !trainerEnabled && routeName.toLowerCase() !== "trainer") {
        return null;
      }

      const profileKey = normalizeTrainerText(entry?.profileKey);
      const displayName = formatTrainerProfileDisplayName(profileKey);
      return {
        profileKey,
        fileName: normalizeTrainerText(entry?.fileName),
        path: normalizeTrainerText(entry?.path),
        updatedAt: Number(entry?.updatedAt) || 0,
        cavebotName: routeName,
        partnerName,
        trainerEnabled,
        displayName,
        characterName: displayName,
      };
    })
    .filter(Boolean)
    .sort((left, right) => (
      String(left.displayName || "").localeCompare(String(right.displayName || ""), undefined, {
        sensitivity: "base",
        numeric: true,
      })
    ));
}

export function findTrainerRosterAccount(entry = {}, accounts = []) {
  const requestedKeys = new Set([
    normalizeTrainerKey(entry?.characterName),
    normalizeTrainerKey(entry?.displayName),
    normalizeTrainerKey(entry?.profileKey),
  ].filter(Boolean));

  if (!requestedKeys.size) {
    return null;
  }

  return (Array.isArray(accounts) ? accounts : []).find((account) => {
    const accountKeys = new Set([
      normalizeTrainerKey(account?.preferredCharacter),
      normalizeTrainerKey(account?.label),
      normalizeTrainerKey(account?.id),
      ...(Array.isArray(account?.characters) ? account.characters.map((value) => normalizeTrainerKey(value)) : []),
    ].filter(Boolean));

    for (const key of requestedKeys) {
      if (accountKeys.has(key)) {
        return true;
      }
    }

    return false;
  }) || null;
}

function findTrainerRosterEntryByKey(roster = [], key = "") {
  const requestedKey = normalizeTrainerKey(key);
  if (!requestedKey) {
    return null;
  }

  return (Array.isArray(roster) ? roster : []).find((entry) => (
    normalizeTrainerKey(entry?.characterName) === requestedKey
    || normalizeTrainerKey(entry?.displayName) === requestedKey
    || normalizeTrainerKey(entry?.profileKey) === requestedKey
  )) || null;
}

export function resolveTrainerRosterLaunchGroup(roster = [], reference = null) {
  const sourceRoster = Array.isArray(roster) ? roster.filter(Boolean) : [];
  if (!sourceRoster.length) {
    return [];
  }

  const seedEntry = typeof reference === "string"
    ? findTrainerRosterEntryByKey(sourceRoster, reference)
    : (reference && typeof reference === "object"
      ? sourceRoster.find((entry) => normalizeTrainerKey(entry.profileKey) === normalizeTrainerKey(reference.profileKey))
      : null);
  if (!seedEntry) {
    return [];
  }

  const queue = [seedEntry];
  const visited = new Set();
  const group = [];

  while (queue.length) {
    const current = queue.shift();
    const currentProfileKey = normalizeTrainerKey(current?.profileKey);
    if (!currentProfileKey || visited.has(currentProfileKey)) {
      continue;
    }

    visited.add(currentProfileKey);
    group.push(current);

    const currentNameKey = normalizeTrainerKey(current?.characterName || current?.displayName);
    const currentPartnerKey = normalizeTrainerKey(current?.partnerName);

    for (const candidate of sourceRoster) {
      const candidateProfileKey = normalizeTrainerKey(candidate?.profileKey);
      if (!candidateProfileKey || visited.has(candidateProfileKey)) {
        continue;
      }

      const candidateNameKey = normalizeTrainerKey(candidate?.characterName || candidate?.displayName);
      const candidatePartnerKey = normalizeTrainerKey(candidate?.partnerName);
      const linked = (
        (currentPartnerKey && currentPartnerKey === candidateNameKey)
        || (candidatePartnerKey && candidatePartnerKey === currentNameKey)
      );

      if (linked) {
        queue.push(candidate);
      }
    }
  }

  return group.sort((left, right) => (
    String(left.displayName || "").localeCompare(String(right.displayName || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  ));
}

export function buildTrainerBootstrapStepExpression({
  loginName = "",
  password = "",
  characterName = "",
} = {}) {
  return `(async () => {
    const BOOTSTRAP_FIELD_STABILIZE_MS = 2_000;
    const BOOTSTRAP_LOGIN_RETRY_COOLDOWN_MS = 15_000;
    const BOOTSTRAP_CHARACTER_RETRY_COOLDOWN_MS = 10_000;
    const desiredCharacterName = ${JSON.stringify(normalizeTrainerText(characterName))};
    const desiredCharacterKey = String(desiredCharacterName || "").trim().toLowerCase();
    const accountLoginName = ${JSON.stringify(normalizeTrainerText(loginName))};
    const accountPassword = ${JSON.stringify(normalizeTrainerText(password))};

    const normalize = (value) => String(value || "").trim().replace(/\\s+/g, " ");
    const normalizeKey = (value) => normalize(value).toLowerCase();
    const isVisible = (element) => {
      if (!element) return false;
      for (let current = element; current && current.nodeType === 1; current = current.parentElement) {
        if (current.isConnected === false) return false;
        if (current.hidden) return false;
        if (current.getAttribute?.("aria-hidden") === "true") return false;
        const style = window.getComputedStyle ? window.getComputedStyle(current) : null;
        if (style && (
          style.display === "none"
          || style.visibility === "hidden"
        )) {
          return false;
        }
      }
      return true;
    };
    const isMountedControl = (element) => {
      if (!element) return false;
      if (element.isConnected === false) return false;
      if (element.hidden) return false;
      if (element.getAttribute?.("aria-hidden") === "true") return false;
      const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
      if (style && (style.display === "none" || style.visibility === "hidden")) {
        return false;
      }
      return true;
    };
    const setInputValue = (element, value) => {
      if (!element) return false;
      const prototype = element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement?.prototype
        : window.HTMLInputElement?.prototype;
      const descriptor = prototype
        ? Object.getOwnPropertyDescriptor(prototype, "value")
        : null;
      if (descriptor?.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    };
    const clickElement = (element) => {
      if (!element) return false;
      element.focus?.();
      for (const eventName of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
        element.dispatchEvent(new MouseEvent(eventName, {
          bubbles: true,
          cancelable: true,
          view: window,
        }));
      }
      if (typeof element.click === "function") {
        element.click();
      }
      return true;
    };
    const bootstrapStateKey = "__minibotTrainerBootstrapState";
    const bootstrapState = (() => {
      const current = window[bootstrapStateKey];
      if (current && typeof current === "object") {
        return current;
      }

      const nextState = {
        loginPreparedAt: 0,
        loginSubmittedAt: 0,
        loginSubmitSignature: "",
        characterSelectedAt: 0,
        characterSelectedKey: "",
        characterSubmittedAt: 0,
        characterSubmitKey: "",
      };
      window[bootstrapStateKey] = nextState;
      return nextState;
    })();
    const now = Date.now();
    const game = window.gameClient;
    const liveCharacterName = normalize(
      game?.player?.name
      || game?.player?.__name
      || game?.player?.state?.name
      || "",
    );
    if (liveCharacterName) {
      const correctCharacter = !desiredCharacterKey || normalizeKey(liveCharacterName) === desiredCharacterKey;
      return {
        ok: correctCharacter,
        state: correctCharacter ? "ready" : "wrong-character",
        inGameName: liveCharacterName,
      };
    }

    const bodyText = normalize(document.body?.innerText || document.body?.textContent || "");
    if (/too many login attempts|try again later/i.test(bodyText)) {
      return {
        ok: false,
        state: "login-rate-limited",
        message: bodyText,
      };
    }

    if (/(account name or password is incorrect|banished|session expired|does not belong to your account|character not found|oauth authentication failed|invalid request)/i.test(bodyText)) {
      return {
        ok: false,
        state: "login-error",
        message: bodyText,
      };
    }

    const characterRows = Array.from(
      document.querySelectorAll("#character-select-list .character-select-row, .character-select-row"),
    ).filter((row) => isVisible(row));
    const getCharacterRowName = (row) => normalize(
      row?.querySelector?.(".character-select-name")?.textContent
      || row?.dataset?.name
      || row?.textContent
      || "",
    );
    const visibleCharacterNames = characterRows
      .map((row) => getCharacterRowName(row))
      .filter(Boolean);
    const enterCharacterButton = document.getElementById("char-select-enter");
    const enterCharacterText = normalize(enterCharacterButton?.innerText || enterCharacterButton?.value || "");
    const characterSelectActive = (
      characterRows.length
      || isVisible(document.getElementById("character-select-modal"))
      || isVisible(enterCharacterButton)
    );

    const loginButton = document.getElementById("enter-game");
    const loginUser = document.getElementById("user-username");
    const loginPassword = document.getElementById("user-password");
    const loginButtonText = normalize(loginButton?.innerText || loginButton?.value || "");
    if (!characterSelectActive && isMountedControl(loginButton) && isMountedControl(loginUser) && isMountedControl(loginPassword)) {
      if (loginButton.disabled || /loading|connecting/i.test(loginButtonText)) {
        return {
          ok: false,
          state: "login-waiting",
          buttonText: loginButtonText,
        };
      }

      const loginValuesMatch = (
        normalize(loginUser.value) === accountLoginName
        && normalize(loginPassword.value) === accountPassword
      );
      if (!loginValuesMatch) {
        setInputValue(loginUser, accountLoginName);
        setInputValue(loginPassword, accountPassword);
        bootstrapState.loginPreparedAt = now;
        bootstrapState.loginSubmittedAt = 0;
        bootstrapState.loginSubmitSignature = "";
        return {
          ok: false,
          state: "login-armed",
          buttonText: loginButtonText || "Login",
        };
      }

      if ((now - (Number(bootstrapState.loginPreparedAt) || 0)) < BOOTSTRAP_FIELD_STABILIZE_MS) {
        return {
          ok: false,
          state: "login-armed",
          buttonText: loginButtonText || "Login",
          waitMs: BOOTSTRAP_FIELD_STABILIZE_MS - (now - (Number(bootstrapState.loginPreparedAt) || 0)),
        };
      }

      const loginSubmitSignature = [accountLoginName, desiredCharacterKey].join("|");
      if (
        bootstrapState.loginSubmitSignature === loginSubmitSignature
        && (now - (Number(bootstrapState.loginSubmittedAt) || 0)) < BOOTSTRAP_LOGIN_RETRY_COOLDOWN_MS
      ) {
        return {
          ok: false,
          state: "login-cooldown",
          buttonText: loginButtonText || "Login",
          waitMs: BOOTSTRAP_LOGIN_RETRY_COOLDOWN_MS - (now - (Number(bootstrapState.loginSubmittedAt) || 0)),
        };
      }

      clickElement(loginButton);
      bootstrapState.loginSubmittedAt = now;
      bootstrapState.loginSubmitSignature = loginSubmitSignature;
      return {
        ok: true,
        state: "login-submitted",
        buttonText: loginButtonText || "Login",
      };
    }

    if (characterSelectActive) {
      const matchedRow = characterRows.find((row) => normalizeKey(getCharacterRowName(row)) === desiredCharacterKey)
        || characterRows.find((row) => normalizeKey(getCharacterRowName(row)).includes(desiredCharacterKey))
        || null;

      if (!matchedRow) {
        return {
          ok: false,
          state: "character-missing",
          availableCharacters: visibleCharacterNames,
        };
      }

      const matchedCharacterKey = normalizeKey(getCharacterRowName(matchedRow));
      if (
        matchedRow.classList.contains("selected")
        && (
          bootstrapState.characterSelectedKey !== matchedCharacterKey
          || !Number(bootstrapState.characterSelectedAt)
        )
      ) {
        bootstrapState.characterSelectedAt = now;
        bootstrapState.characterSelectedKey = matchedCharacterKey;
        return {
          ok: false,
          state: "character-selected",
          selectedCharacter: getCharacterRowName(matchedRow),
          availableCharacters: visibleCharacterNames,
        };
      }

      if (!matchedRow.classList.contains("selected")) {
        clickElement(matchedRow);
        bootstrapState.characterSelectedAt = now;
        bootstrapState.characterSelectedKey = matchedCharacterKey;
        return {
          ok: false,
          state: "character-selected",
          selectedCharacter: getCharacterRowName(matchedRow),
          availableCharacters: visibleCharacterNames,
        };
      }

      if (
        bootstrapState.characterSelectedKey === matchedCharacterKey
        && (now - (Number(bootstrapState.characterSelectedAt) || 0)) < BOOTSTRAP_FIELD_STABILIZE_MS
      ) {
        return {
          ok: false,
          state: "character-selected",
          selectedCharacter: getCharacterRowName(matchedRow),
          availableCharacters: visibleCharacterNames,
          waitMs: BOOTSTRAP_FIELD_STABILIZE_MS - (now - (Number(bootstrapState.characterSelectedAt) || 0)),
        };
      }

      if (!isVisible(enterCharacterButton) || enterCharacterButton.disabled || /loading/i.test(enterCharacterText)) {
        return {
          ok: false,
          state: "character-enter-waiting",
          selectedCharacter: getCharacterRowName(matchedRow),
          availableCharacters: visibleCharacterNames,
        };
      }

      if (
        bootstrapState.characterSubmitKey === matchedCharacterKey
        && (now - (Number(bootstrapState.characterSubmittedAt) || 0)) < BOOTSTRAP_CHARACTER_RETRY_COOLDOWN_MS
      ) {
        return {
          ok: false,
          state: "character-enter-cooldown",
          selectedCharacter: getCharacterRowName(matchedRow),
          availableCharacters: visibleCharacterNames,
          waitMs: BOOTSTRAP_CHARACTER_RETRY_COOLDOWN_MS - (now - (Number(bootstrapState.characterSubmittedAt) || 0)),
        };
      }

      clickElement(enterCharacterButton);
      bootstrapState.characterSubmittedAt = now;
      bootstrapState.characterSubmitKey = matchedCharacterKey;
      return {
        ok: true,
        state: "character-entered",
        selectedCharacter: getCharacterRowName(matchedRow),
        availableCharacters: visibleCharacterNames,
      };
    }

    return {
      ok: false,
      state: "waiting",
      title: document.title || "",
      href: location.href,
    };
  })()`;
}
