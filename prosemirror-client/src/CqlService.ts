type Token = {
  tokenType: string;
  lexeme: String;
  literal?: String;
  start: number;
  end: number;
};

export class CqlService {
  constructor(private url: string) {}

  public async fetchTokens(query: string) {
    const urlParams = new URLSearchParams();
    urlParams.append("query", query);
    const request = await fetch(`${this.url}/cql?${urlParams}`);

    return await request.json();
  }
}
