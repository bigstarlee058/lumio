export namespace GmailApi {
  export interface MessagePartHeader {
    name?: string | null;
    value?: string | null;
  }

  export interface MessagePartBody {
    attachmentId?: string | null;
    data?: string | null;
    size?: number | null;
  }

  export interface MessagePart {
    partId?: string | null;
    mimeType?: string | null;
    filename?: string | null;
    headers?: MessagePartHeader[] | null;
    body?: MessagePartBody | null;
    parts?: MessagePart[] | null;
  }

  export interface Message {
    id?: string | null;
    threadId?: string | null;
    labelIds?: string[] | null;
    snippet?: string | null;
    payload?: MessagePart | null;
    internalDate?: string | null;
  }
}
