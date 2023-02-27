type SpecTuple = [regexp: RegExp, string: string];

/**
 * Tokenizer Specification
 */
const Spec: Array<SpecTuple> = [
  // -----------------------
  // Whitespaces
  [/^\s+/, null],

  // -----------------------
  // Symbols, delimiters
  [/^\,/, ','],
  [/^\./, '.'],
  [/^\(/, '('],
  [/^\)/, ')'],

  // -----------------------
  // Numbers
  [/^\d+/, 'NUMBER'],

  // -----------------------
  // $identifier for variables
  [/^\$\w+/, 'VARIABLE'],

  // -----------------------
  // Equality operator: ==
  [/^[!=]=/, 'EQUALITY_OPERATOR'],


  // -----------------------
  // Identifiers
  [/^\w+/, 'IDENTIFIER'],

  // -----------------------
  // Strings
  [/^"[^"]*"/, 'STRING'],
  [/^'[^']*'/, 'STRING'],
];

/**
 * Tokenizer class.
 *
 * Pulls a token from a stream
 */
export class Tokenizer {
  private _string: string;
  private _cursor: number;
  /**
   * Initialize the string
   * @param string
   */
  init(string: string) {
    this._string = string;
    this._cursor = 0;
  }
  /**
   * Gets the next token
   * @returns
   */
  getNextToken() {
    if (!this.hasMoreTokens()) {
      return null;
    }
    const string = this._string.slice(this._cursor);

    // Trying all regular expressions from Spec
    for (const [regex, tokenType] of Spec) {
      const tokenValue = this._match(regex, string);

      // Couldn't match the rule, continue
      if (tokenValue === null) {
        continue;
      }

      // If token type is null, then skip (e.g. whitespaces)
      if (tokenType === null) {
        return this.getNextToken();
      }

      return {
        type: tokenType,
        value: tokenValue,
      };
    }
    // Throw error if no Reg Exp matched
    throw new SyntaxError(`Unexpected token: "${string[0]}"`);
  }
  /**
   * Checks whether there are more tokens left
   */
  hasMoreTokens(): boolean {
    return this._cursor < this._string.length;
  }

  /**
   * Checks thether the tokenizer reached the end of file
   */
  isEOF(): boolean {
    return this._cursor === this._string.length;
  }

  private _match(regexp: RegExp, string: string): string {
    const matched = regexp.exec(string);
    if (matched === null) {
      return null;
    }
    this._cursor += matched[0].length;
    return matched[0];
  }
}
