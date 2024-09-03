const whitespaceR = /\s/;
export const isWhitespace = (str: string) => whitespaceR.test(str);

const letterOrDigitR = /[0-9A-z]/;
export const  isLetterOrDigit = (str: string) => letterOrDigitR.test(str);
