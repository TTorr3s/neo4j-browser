# Monaco Editor 0.55 - Complete Technical & Migration Guide
## Extended Edition for Language, Tokenization, Completion & Theme APIs
### For Automated Refactoring Agents and LLM Code Assistants

This document expands the original migration guide by adding **full documentation for Monaco's language APIs**, including:

- `languages.IState`
- `languages.TokensProvider`
- Tokenization contracts
- Language registration and configuration
- Completion APIs
- Theme APIs
- KeyCode usage in editors embedding Monaco

It is tailored for maintaining large editors such as Neo4j Browser's Cypher editor.

---

# 0. Index

1. Migration & API boundaries (core stability model)
2. Tokenization API
   2.1 `IState`
   2.2 `TokensProvider`
   2.3 `ILineTokens`
3. Language Registration
4. Language Configuration (`setLanguageConfiguration`)
5. Autocomplete / CompletionItem API
6. Theme System (`defineTheme`, token rules, colors)
7. Keybindings & KeyCode
8. Safe usage patterns
9. Prohibited patterns (as of 0.55)

---

# 1. API Stability Model (Recap)

Monaco Editor separates:

### **Stable API**
Accessible through:

```
monaco-editor/esm/vs/editor/editor.api
```

Includes:

- `languages` namespace
- `editor` namespace
- `IStandaloneCodeEditor`
- `ITextModel`
- Providers (tokens, completion, hover, signature help)
- Themes

### **Unstable API**
Anything not exported from `editor.api`, including:

- Fields starting with `_`
- Internal contributions (`editor.contrib.suggestController`, etc.)
- DOM widgets belonging to Monaco (suggest widget, quick input)
- Prototype overrides

Stable API must be used exclusively in 0.55.

---

# 2. Tokenization API (Stable)

Monaco provides a simplified tokenization interface used before the newer Monarch engine or custom lexers.
Cypher uses a **custom lexer**, so the following interfaces apply.

---

## 2.1. `languages.IState`

Contract:

```ts
interface IState {
  clone(): IState;
  equals(other: IState): boolean;
}
```

Usage:

```ts
class CypherState implements languages.IState {
  clone() {
    return new CypherState();
  }

  equals() {
    return true; // Stateless tokenizer
  }
}
```

### Notes:
- Returning a new instance is required: tokenizer state is immutable.
- Stateless lexers can always return `true` for `equals`.

---

## 2.2. `languages.TokensProvider`

Interface:

```ts
interface TokensProvider {
  getInitialState(): IState;
  tokenize(line: string, state: IState): ILineTokens;
}
```

Your implementation:

```ts
languages.setTokensProvider("cypher", new CypherTokensProvider());
```

Tokenizers must return objects matching:

---

## 2.3. `languages.ILineTokens`

Structure:

```ts
interface ILineTokens {
  endState: IState;
  tokens: IToken[];
}

interface IToken {
  startIndex: number;
  scopes: string;
}
```

Important rules:

- `tokens` must be **sorted by `startIndex` ascending**.
- `scopes` drive theme highlighting.
- Themes match tokens via: `token: "<scope>"`.

In Cypher:

```ts
scopes = TOKEN_TYPE.toLowerCase() + ".cypher";
```

This allows theme rules such as:

```ts
{ token: "keyword.cypher", foreground: "00ff00" }
```

---

# 3. Language Registration API

Before using any tokenizer, autocompletion or themes:

```ts
languages.register({ id: "cypher" });
```

This only declares the existence of a language ID.

---

# 4. Language Configuration (`setLanguageConfiguration`)

Defines brackets, comments, auto-closing rules, etc.

Example:

```ts
languages.setLanguageConfiguration("cypher", {
  brackets: [
    ["(", ")"],
    ["{", "}"],
    ["[", "]"],
    ["'", "'"],
    ['"', '"']
  ],
  comments: {
    blockComment: ["/*", "*/"],
    lineComment: "//"
  }
});
```

### Allowed properties:

- `brackets`
- `autoClosingPairs`
- `surroundingPairs`
- `comments`
- `indentationRules`
- `wordPattern`

### Not allowed:

Any access to internal language configs.

---

# 5. Completion API (Autocomplete)

The completion provider must implement:

```ts
languages.registerCompletionItemProvider(languageId, {
  triggerCharacters?: string[];
  provideCompletionItems(model, position, context, token): ProviderResult<CompletionList>;
});
```

Completion list contracts:

```ts
interface CompletionList {
  suggestions: CompletionItem[];
}
```

Completion item fields (stable):

```ts
interface CompletionItem {
  label: string | CompletionItemLabel;
  kind: CompletionItemKind;
  insertText: string;
  range: IRange;
  detail?: string;
  sortText?: string;
}
```

### Important rules:

- You **must** return valid ranges.
- Do not insert text outside the range.
- Sorting is controlled via `sortText`: using sortable string encoding is valid.
- You can generate dynamic ranges based on preceding symbols.

Your implementation uses:

```ts
model.getWordUntilPosition(position)
```

This is correct.

### CompletionItemKind mapping

Allowed kinds include:

- `Keyword`
- `Field`
- `Reference`
- `Variable`
- `Function`
- `Operator`
- `Property`
- `TypeParameter`

You correctly map Cypher categories to Monaco kinds.

---

# 6. Theme API

Monaco exposes two theme components:

### 6.1. Standalone theme data

```ts
interface IStandaloneThemeData {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: ITokenThemeRule[];
  colors: IColors;
}
```

### 6.2. Token theme rules

```ts
interface ITokenThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}
```

Your Cypher theme uses scopes like:

```
"{keyword}.cypher"
```

### 6.3. Defining theme

```ts
editor.defineTheme("light", monacoLightTheme);
editor.defineTheme("dark", monacoDarkTheme);
```

### 6.4. Setting theme

```ts
editor.setTheme("light");
```

### Notes:

- Themes must be defined **before** use.
- Token scopes must match tokens provided by tokenizer.

---

# 7. Keybindings & KeyCode (Safe API)

Monaco exposes:

```ts
import { KeyCode, KeyMod } from "monaco-editor/esm/vs/editor/editor.api";
```

Stable values:

- `KeyCode.Enter`
- `KeyCode.Tab`
- `KeyCode.UpArrow`
- `KeyCode.DownArrow`
- `KeyCode.Space`
- `KeyCode.Escape`
- Others documented

### Binding commands:

```ts
editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, handler, context);
```

### Context expressions (safe):

- `"!suggestWidgetVisible"`
- `"!findWidgetVisible"`

These use the Keybinding Context Key Service (public).

### Deprecated:

`KeyMod.WinCtrl` is non-portable and should be avoided.

---

# 8. Safe Usage Patterns (0.55)

## Allowed:
- `languages.register`
- `languages.setLanguageConfiguration`
- `languages.setTokensProvider`
- `languages.registerCompletionItemProvider`
- `editor.defineTheme`
- `editor.setTheme`
- `editor.addCommand`
- Token scopes ending in `.cypher`
- Ranges derived from `getWordUntilPosition`

## Highly recommended:
- Sorting tokens by `startIndex`
- Returning new instances of states
- Using strictly `editor.api` imports

---

# 9. Prohibited Patterns (0.55)

Do **not**:

- Access private fields (anything with `_`)
- Modify widget prototypes
- Reposition internal widgets (e.g., suggest, quick input)
- Use undocumented contributions
- Patch or reflect internal types such as `QuickInputList`
- Depend on DOM structures belonging to Monaco

Your existing quick input patch:

```ts
editor._modelData.view._contentWidgets...
```

Must be removed.

---

# Final Notes

This extended document now includes the stable and complete description of:

- Tokenization APIs
- Language registration
- Completion rules
- Themeing
- KeyCodes
- Safe/unsafe usage

It can now fully support the refactoring of:

- Cypher tokenizer
- Cypher autocomplete
- Cypher theme definitions
- Keybinding handlers

When integrated with the original migration document, this forms a complete Monaco Editor 0.55 development and maintenance reference for any LLM agent.

