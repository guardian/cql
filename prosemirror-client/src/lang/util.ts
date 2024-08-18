const whitespaceR = /s/g;
const isWhitespace = (str: string) => str.match(whitespaceR);

const letterOrDigitR = /[0-9A-z]/g;
const isLetterOrDigit = (str: string) => str.match(letterOrDigitR);
