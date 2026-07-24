import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search";
import type { EditorView, Panel, ViewUpdate } from "@codemirror/view";
import { runScopeHandlers } from "@codemirror/view";

/**
 * JetBrains-like find/replace panel for CodeMirror.
 * Keeps CM search state/commands; replaces the stock chrome.
 */
export function createEditorSearchPanel(view: EditorView): Panel {
  return new EditorSearchPanel(view);
}

class EditorSearchPanel implements Panel {
  dom: HTMLElement;
  top = true;

  private view: EditorView;
  private query: SearchQuery;
  private searchField: HTMLInputElement;
  private replaceField: HTMLInputElement;
  private caseBtn: HTMLButtonElement;
  private reBtn: HTMLButtonElement;
  private wordBtn: HTMLButtonElement;
  private matchCount: HTMLSpanElement;

  constructor(view: EditorView) {
    this.view = view;
    this.query = getSearchQuery(view.state);
    this.commit = this.commit.bind(this);

    this.searchField = document.createElement("input");
    Object.assign(this.searchField, {
      type: "text",
      value: this.query.search,
      placeholder: "Find",
      name: "search",
      autocomplete: "off",
      spellcheck: false,
    });
    this.searchField.className = "cm-jb-search-input";
    this.searchField.setAttribute("aria-label", "Find");
    this.searchField.setAttribute("main-field", "true");
    this.searchField.addEventListener("input", this.commit);
    this.searchField.addEventListener("change", this.commit);

    this.replaceField = document.createElement("input");
    Object.assign(this.replaceField, {
      type: "text",
      value: this.query.replace,
      placeholder: "Replace",
      name: "replace",
      autocomplete: "off",
      spellcheck: false,
    });
    this.replaceField.className = "cm-jb-search-input";
    this.replaceField.setAttribute("aria-label", "Replace");
    this.replaceField.addEventListener("input", this.commit);
    this.replaceField.addEventListener("change", this.commit);

    this.caseBtn = makeToggle("Aa", "Match case", this.query.caseSensitive, this.commit);
    this.reBtn = makeToggle(".*", "Regex", this.query.regexp, this.commit);
    this.wordBtn = makeToggle("W", "Whole word", this.query.wholeWord, this.commit);

    this.matchCount = document.createElement("span");
    this.matchCount.className = "cm-jb-search-count";

    const findLabel = document.createElement("span");
    findLabel.className = "cm-jb-search-label";
    findLabel.textContent = "Find";

    const findRow = document.createElement("div");
    findRow.className = "cm-jb-search-row";
    findRow.append(
      findLabel,
      this.searchField,
      this.matchCount,
      makeIconButton("Previous match", () => findPrevious(view), CHEVRON_UP),
      makeIconButton("Next match", () => findNext(view), CHEVRON_DOWN),
      this.caseBtn,
      this.reBtn,
      this.wordBtn,
      makeIconButton("Close", () => closeSearchPanel(view), CLOSE_ICON),
    );

    const replaceLabel = document.createElement("span");
    replaceLabel.className = "cm-jb-search-label";
    replaceLabel.textContent = "Replace";

    const replaceRow = document.createElement("div");
    replaceRow.className = "cm-jb-search-row";
    replaceRow.append(
      replaceLabel,
      this.replaceField,
      makeTextButton("Replace", () => replaceNext(view)),
      makeTextButton("All", () => replaceAll(view)),
      makeTextButton("Select all", () => selectMatches(view)),
    );
    if (view.state.readOnly) {
      replaceRow.hidden = true;
    }

    this.dom = document.createElement("div");
    this.dom.className = "cm-search cm-jb-search";
    this.dom.addEventListener("keydown", (e) => this.keydown(e));
    this.dom.append(findRow, replaceRow);

    this.updateMatchCount();
  }

  mount() {
    this.searchField.select();
  }

  update(update: ViewUpdate) {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.setQuery(effect.value);
        }
      }
    }
    if (update.docChanged) {
      this.updateMatchCount();
    }
  }

  private setQuery(query: SearchQuery) {
    this.query = query;
    this.searchField.value = query.search;
    this.replaceField.value = query.replace;
    setToggle(this.caseBtn, query.caseSensitive);
    setToggle(this.reBtn, query.regexp);
    setToggle(this.wordBtn, query.wholeWord);
    this.updateMatchCount();
  }

  private commit() {
    const query = new SearchQuery({
      search: this.searchField.value,
      caseSensitive: isToggleOn(this.caseBtn),
      regexp: isToggleOn(this.reBtn),
      wholeWord: isToggleOn(this.wordBtn),
      replace: this.replaceField.value,
    });
    if (!query.eq(this.query)) {
      this.query = query;
      this.view.dispatch({ effects: setSearchQuery.of(query) });
    }
    this.updateMatchCount();
  }

  private keydown(e: KeyboardEvent) {
    if (runScopeHandlers(this.view, e, "search-panel")) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" && e.target === this.searchField) {
      e.preventDefault();
      (e.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e.key === "Enter" && e.target === this.replaceField) {
      e.preventDefault();
      replaceNext(this.view);
    }
  }

  private updateMatchCount() {
    const q = this.searchField.value;
    if (!q) {
      this.matchCount.textContent = "";
      return;
    }
    if (!this.query.valid) {
      this.matchCount.textContent = "Invalid";
      return;
    }

    let count = 0;
    const cursor = this.query.getCursor(this.view.state);
    // Cap for large documents
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const next = cursor.next();
      if (next.done) break;
      count++;
      if (count > 999) break;
    }

    this.matchCount.textContent =
      count > 999 ? "999+" : count === 0 ? "No results" : `${count}`;
  }
}

function makeToggle(
  label: string,
  title: string,
  on: boolean,
  onChange: () => void,
) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cm-jb-search-toggle";
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.textContent = label;
  setToggle(btn, on);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    setToggle(btn, !isToggleOn(btn));
    onChange();
  });
  return btn;
}

function isToggleOn(btn: HTMLButtonElement) {
  return btn.dataset.checked === "true";
}

function setToggle(btn: HTMLButtonElement, on: boolean) {
  btn.dataset.checked = on ? "true" : "false";
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.classList.toggle("cm-jb-search-toggle-on", on);
}

function makeIconButton(title: string, onClick: () => void, svg: string) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cm-jb-search-icon-btn";
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.innerHTML = svg;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
  return btn;
}

function makeTextButton(label: string, onClick: () => void) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cm-jb-search-text-btn";
  btn.textContent = label;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
  return btn;
}

const CHEVRON_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';
const CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const CLOSE_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
