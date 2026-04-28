import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  buildTrainerBootstrapStepExpression,
  buildTrainerRoster,
  findTrainerRosterAccount,
  resolveTrainerRosterLaunchGroup,
} from "../lib/trainer-bootstrap.mjs";

function createVisibleDom(html) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "https://minibia.com/play",
  });
  const { window } = dom;

  const makeVisible = (element) => {
    if (!element) return;
    Object.defineProperty(element, "offsetWidth", {
      configurable: true,
      get: () => 120,
    });
    Object.defineProperty(element, "offsetHeight", {
      configurable: true,
      get: () => 32,
    });
    element.getClientRects = () => [{ width: 120, height: 32 }];
  };

  window.document.querySelectorAll("*").forEach((element) => makeVisible(element));
  return dom;
}

test("trainer bootstrap builds linked roster groups and matches saved accounts", () => {
  const roster = buildTrainerRoster([
    {
      profileKey: "czarnobrat",
      fileName: "czarnobrat.json",
      path: "/tmp/czarnobrat.json",
      updatedAt: 1,
      options: {
        cavebotName: "Trainer",
        trainerEnabled: true,
        trainerPartnerName: "Zlocimir Wielkoportf",
      },
    },
    {
      profileKey: "zlocimir-wielkoportf",
      fileName: "zlocimir-wielkoportf.json",
      path: "/tmp/zlocimir-wielkoportf.json",
      updatedAt: 2,
      options: {
        cavebotName: "Trainer",
        trainerEnabled: true,
        trainerPartnerName: "Czarnobrat",
      },
    },
    {
      profileKey: "rotworm-knight",
      fileName: "rotworm-knight.json",
      path: "/tmp/rotworm-knight.json",
      updatedAt: 3,
      options: {
        cavebotName: "rotworms",
        trainerEnabled: false,
        trainerPartnerName: "",
      },
    },
  ]);

  assert.deepEqual(
    roster.map((entry) => entry.profileKey),
    ["czarnobrat", "zlocimir-wielkoportf"],
  );
  assert.deepEqual(
    resolveTrainerRosterLaunchGroup(roster, "czarnobrat").map((entry) => entry.profileKey),
    ["czarnobrat", "zlocimir-wielkoportf"],
  );

  const account = findTrainerRosterAccount(roster[0], [
    {
      id: "main-pair-a",
      preferredCharacter: "Czarnobrat",
      characters: ["Czarnobrat"],
    },
  ]);
  assert.equal(account?.id, "main-pair-a");
});

test("trainer bootstrap login step fills the login form and clicks enter", async () => {
  const dom = createVisibleDom(`
    <body>
      <input id="user-username" value="" />
      <input id="user-password" value="" />
      <button id="enter-game">Login</button>
    </body>
  `);
  const { window } = dom;
  let clicked = 0;
  window.document.getElementById("enter-game").addEventListener("click", () => {
    clicked += 1;
  });

  const expression = buildTrainerBootstrapStepExpression({
    loginName: "12345678a",
    password: "0987654321",
    characterName: "Czarnobrat",
  });

  const armedResult = await window.eval(expression);
  assert.equal(armedResult.state, "login-armed");
  assert.equal(clicked, 0);

  await new Promise((resolve) => setTimeout(resolve, 2100));
  const result = await window.eval(expression);

  assert.equal(result.state, "login-submitted");
  assert.equal(window.document.getElementById("user-username").value, "12345678a");
  assert.equal(window.document.getElementById("user-password").value, "0987654321");
  assert.ok(clicked >= 1);
  dom.window.close();
});

test("trainer bootstrap login step accepts mounted zero-size login controls", async () => {
  const dom = new JSDOM(`
    <body>
      <input id="user-username" value="" />
      <input id="user-password" value="" />
      <button id="enter-game">Login</button>
    </body>
  `, {
    runScripts: "outside-only",
    url: "https://minibia.com/play",
  });
  const { window } = dom;
  let clicked = 0;
  window.document.getElementById("enter-game").addEventListener("click", () => {
    clicked += 1;
  });

  const expression = buildTrainerBootstrapStepExpression({
    loginName: "12345678a",
    password: "0987654321",
    characterName: "Czarnobrat",
  });

  const armedResult = await window.eval(expression);
  assert.equal(armedResult.state, "login-armed");
  assert.equal(clicked, 0);

  await new Promise((resolve) => setTimeout(resolve, 2100));
  const result = await window.eval(expression);

  assert.equal(result.state, "login-submitted");
  assert.equal(window.document.getElementById("user-username").value, "12345678a");
  assert.equal(window.document.getElementById("user-password").value, "0987654321");
  assert.ok(clicked >= 1);
  dom.window.close();
});

test("trainer bootstrap login step backs off after a submit instead of clicking repeatedly", async () => {
  const dom = createVisibleDom(`
    <body>
      <input id="user-username" value="" />
      <input id="user-password" value="" />
      <button id="enter-game">Login</button>
    </body>
  `);
  const { window } = dom;
  let clicked = 0;
  window.document.getElementById("enter-game").addEventListener("click", () => {
    clicked += 1;
  });

  const expression = buildTrainerBootstrapStepExpression({
    loginName: "12345678a",
    password: "0987654321",
    characterName: "Czarnobrat",
  });

  assert.equal((await window.eval(expression)).state, "login-armed");
  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.equal((await window.eval(expression)).state, "login-submitted");
  const submittedClicks = clicked;
  assert.ok(submittedClicks >= 1);
  assert.equal((await window.eval(expression)).state, "login-cooldown");
  assert.equal(clicked, submittedClicks);
  dom.window.close();
});

test("trainer bootstrap stops on rate-limit text instead of retrying", async () => {
  const dom = createVisibleDom(`
    <body>
      <div>Information</div>
      <div>Too many login attempts. Please try again later.</div>
      <input id="user-username" value="" />
      <input id="user-password" value="" />
      <button id="enter-game">Login</button>
    </body>
  `);
  const { window } = dom;

  const result = await window.eval(buildTrainerBootstrapStepExpression({
    loginName: "12345678a",
    password: "0987654321",
    characterName: "Czarnobrat",
  }));

  assert.equal(result.state, "login-rate-limited");
  assert.match(result.message, /too many login attempts/i);
  dom.window.close();
});

test("trainer bootstrap character step selects the requested character and enters", async () => {
  const dom = createVisibleDom(`
    <body>
      <div id="character-select-modal">
        <div id="character-select-list">
          <div class="character-select-row">
            <span class="character-select-name">Czarnobrat</span>
          </div>
          <div class="character-select-row">
            <span class="character-select-name">Zlocimir Wielkoportf</span>
          </div>
        </div>
        <button id="char-select-enter">Enter Game</button>
      </div>
    </body>
  `);
  const { window } = dom;
  const selectedRows = [];
  window.document.querySelectorAll(".character-select-row").forEach((row) => {
    row.addEventListener("click", () => {
      row.classList.add("selected");
      selectedRows.push(row.querySelector(".character-select-name")?.textContent?.trim() || "");
    });
  });
  let enterClicks = 0;
  window.document.getElementById("char-select-enter").addEventListener("click", () => {
    enterClicks += 1;
  });

  const expression = buildTrainerBootstrapStepExpression({
    loginName: "12345678a",
    password: "0987654321",
    characterName: "Zlocimir Wielkoportf",
  });

  const selectedResult = await window.eval(expression);
  assert.equal(selectedResult.state, "character-selected");

  await new Promise((resolve) => setTimeout(resolve, 2100));
  const result = await window.eval(expression);

  assert.equal(result.state, "character-entered");
  assert.equal(result.selectedCharacter, "Zlocimir Wielkoportf");
  assert.deepEqual(selectedRows.slice(-1), ["Zlocimir Wielkoportf"]);
  assert.ok(enterClicks >= 1);
  dom.window.close();
});

test("trainer bootstrap enters selected character when hidden login form remains mounted", async () => {
  const dom = createVisibleDom(`
    <body>
      <div id="floater-enter" style="display: none;">
        <input id="user-username" value="12345678b" />
        <input id="user-password" value="0987654321" />
        <button id="enter-game">Login</button>
      </div>
      <div id="character-select-modal">
        <div id="character-select-list">
          <div class="character-select-row selected">
            <span class="character-select-name">Czarnobrat</span>
            <span class="character-select-info">Level 8 - Knight</span>
          </div>
        </div>
        <button id="char-select-enter">Enter Game</button>
      </div>
    </body>
  `);
  const { window } = dom;
  let loginClicks = 0;
  let enterClicks = 0;
  window.document.getElementById("enter-game").addEventListener("click", () => {
    loginClicks += 1;
  });
  window.document.getElementById("char-select-enter").addEventListener("click", () => {
    enterClicks += 1;
  });

  const expression = buildTrainerBootstrapStepExpression({
    loginName: "12345678b",
    password: "0987654321",
    characterName: "Czarnobrat",
  });

  const selectedResult = await window.eval(expression);
  assert.equal(selectedResult.state, "character-selected");
  assert.equal(loginClicks, 0);
  assert.equal(enterClicks, 0);

  await new Promise((resolve) => setTimeout(resolve, 2100));
  const result = await window.eval(expression);

  assert.equal(result.state, "character-entered");
  assert.equal(result.selectedCharacter, "Czarnobrat");
  assert.equal(loginClicks, 0);
  assert.ok(enterClicks >= 1);
  dom.window.close();
});
